import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain, x-shopify-api-version",
};

// Get webhook secret from environment
const SHOPIFY_WEBHOOK_SECRET = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");

interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  currency: string;
  note?: string;
  note_attributes?: Array<{
    name: string;
    value: string;
  }>;
  customer?: {
    first_name?: string;
    last_name?: string;
  };
  line_items: Array<{
    title: string;
    quantity: number;
    price: string;
    product_id: number;
    variant_id: number;
  }>;
  shipping_address: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    province?: string;
    country: string;
    zip?: string;
    phone?: string;
  } | null;
  created_at: string;
}

// Verify HMAC signature from Shopify using Web Crypto API
async function verifyShopifyHmac(body: string, hmacHeader: string | null): Promise<boolean> {
  if (!SHOPIFY_WEBHOOK_SECRET) {
    console.error("SHOPIFY_WEBHOOK_SECRET is not configured");
    return false;
  }

  if (!hmacHeader) {
    console.error("Missing x-shopify-hmac-sha256 header");
    return false;
  }

  try {
    // Encode the secret and body
    const encoder = new TextEncoder();
    const keyData = encoder.encode(SHOPIFY_WEBHOOK_SECRET);
    const messageData = encoder.encode(body);

    // Import the secret key
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Sign the message
    const signature = await crypto.subtle.sign("HMAC", key, messageData);

    // Convert to base64
    const computedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // Constant-time comparison to prevent timing attacks
    if (computedHmac.length !== hmacHeader.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < computedHmac.length; i++) {
      result |= computedHmac.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    console.error("HMAC verification error:", error);
    return false;
  }
}

async function sendOrderConfirmationEmail(order: ShopifyOrder, customerEmail: string) {
  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
  
  const formattedDate = new Date(order.created_at).toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const itemsHtml = order.line_items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${item.title}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: left;">₪${item.price}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f5e6d3 0%, #e8d5c4 100%); padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: #333; font-size: 28px;">יום האם</h1>
          <p style="margin: 10px 0 0; color: #666;">אישור הזמנה</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #333; margin-top: 0;">תודה על הזמנתך! 💜</h2>
          
          <p style="color: #666; line-height: 1.6;">
            ${order.shipping_address?.name || 'לקוח/ה יקר/ה'},<br>
            ההזמנה שלך התקבלה בהצלחה ואנחנו כבר מתחילים להכין אותה עבורך.
          </p>
          
          <!-- Order Info Box -->
          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px;"><strong>מספר הזמנה:</strong> #${order.order_number}</p>
            <p style="margin: 0;"><strong>תאריך:</strong> ${formattedDate}</p>
          </div>
          
          <!-- Items Table -->
          <h3 style="color: #333; border-bottom: 2px solid #f5e6d3; padding-bottom: 10px;">פרטי ההזמנה</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f9f9f9;">
                <th style="padding: 12px; text-align: right;">מוצר</th>
                <th style="padding: 12px; text-align: center;">כמות</th>
                <th style="padding: 12px; text-align: left;">מחיר</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold;">סה״כ:</td>
                <td style="padding: 12px; text-align: left; font-weight: bold; font-size: 18px;">₪${order.total_price}</td>
              </tr>
            </tfoot>
          </table>
          
          <!-- Shipping Address -->
          ${order.shipping_address ? `
            <h3 style="color: #333; border-bottom: 2px solid #f5e6d3; padding-bottom: 10px; margin-top: 30px;">כתובת למשלוח</h3>
            <p style="color: #666; line-height: 1.8;">
              ${order.shipping_address.name}<br>
              ${order.shipping_address.address1}<br>
              ${order.shipping_address.city}, ${order.shipping_address.country}
            </p>
          ` : ''}
          
          <!-- Next Steps -->
          <div style="background: #e8f5e9; border-radius: 8px; padding: 20px; margin-top: 30px;">
            <h4 style="margin: 0 0 10px; color: #2e7d32;">מה הלאה?</h4>
            <p style="margin: 0; color: #666;">
              נעדכן אותך במייל כשההזמנה תישלח עם מספר מעקב.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0 0 10px;">יש שאלות? אנחנו כאן בשבילך</p>
          <a href="mailto:hello@yomhaem.co.il" style="color: #f5e6d3;">hello@yomhaem.co.il</a>
          <p style="margin: 15px 0 0; font-size: 12px; color: #999;">© יום האם - כל הזכויות שמורות</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { error } = await resend.emails.send({
      from: 'יום האם <noreply@mothersday.co.il>',
      to: [customerEmail],
      subject: `אישור הזמנה #${order.order_number} - יום האם`,
      html,
    });

    if (error) {
      console.error("Error sending order confirmation email:", error);
      throw error;
    }

    console.log(`Order confirmation email sent to ${customerEmail}`);
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    // Don't throw - we don't want email failures to break the webhook
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read the raw body first for HMAC verification
    const body = await req.text();
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256");

    // Verify HMAC signature
    const isValid = await verifyShopifyHmac(body, hmacHeader);
    if (!isValid) {
      console.error("HMAC verification failed - unauthorized request");
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid HMAC signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("HMAC verification successful");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body after verification
    const order: ShopifyOrder = JSON.parse(body);
    console.log("Received order webhook:", order.id);

    // Find user by email from Shopify order
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching users:", authError);
      throw authError;
    }

    // Try to extract user_id from order note or attributes (better matching)
    let userIdFromOrder: string | undefined;
    
    // Check note field for user_id
    if (order.note) {
      const noteMatch = order.note.match(/supabase_user_id:([a-f0-9-]+)/i);
      if (noteMatch) {
        userIdFromOrder = noteMatch[1];
        console.log(`Found user_id in order note: ${userIdFromOrder}`);
      }
    }
    
    // Check note_attributes for user_id (backup method)
    if (!userIdFromOrder && order.note_attributes) {
      const userIdAttr = order.note_attributes.find(
        (attr: any) => attr.name === 'supabase_user_id'
      );
      if (userIdAttr) {
        userIdFromOrder = userIdAttr.value;
        console.log(`Found user_id in note_attributes: ${userIdFromOrder}`);
      }
    }

    // Match order to user - try by user_id first, then by email
    let matchedUser = userIdFromOrder 
      ? authUser.users.find(user => user.id === userIdFromOrder)
      : undefined;
    
    if (!matchedUser) {
      // Fallback to email matching
      matchedUser = authUser.users.find(user => user.email === order.email);
      if (matchedUser) {
        console.log(`Matched order to user by email: ${matchedUser.id}`);
      }
    } else {
      console.log(`Matched order to user by user_id: ${matchedUser.id}`);
    }
    
    if (!matchedUser) {
      console.log(`No user found for order ${order.id}. Storing as unlinked order.`);
      
      // Store unlinked order for admin review
      const { error: unlinkedError } = await supabase
        .from("unlinked_orders")
        .insert({
          shopify_order_id: order.id.toString(),
          shopify_order_number: order.order_number.toString(),
          order_email: order.email,
          order_data: order as any,
        });
      
      if (unlinkedError) {
        console.error("Error storing unlinked order:", unlinkedError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No user found - order stored as unlinked',
          orderId: order.id 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Store order in database with user_id
    const { error: insertError } = await supabase
      .from("orders")
      .upsert({
        shopify_order_id: order.id.toString(),
        shopify_order_number: order.order_number.toString(),
        order_status: order.fulfillment_status || 'unfulfilled',
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        total_price: order.total_price,
        currency_code: order.currency,
        line_items: order.line_items.map(item => ({
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          product_id: item.product_id,
          variant_id: item.variant_id,
        })),
        shipping_address: order.shipping_address,
        user_id: matchedUser.id,
      }, {
        onConflict: 'shopify_order_id'
      });

    if (insertError) {
      console.error("Error inserting order:", insertError);
      throw insertError;
    }

    console.log("Order stored successfully:", order.id);

    // Send order confirmation email
    await sendOrderConfirmationEmail(order, order.email);

    return new Response(
      JSON.stringify({ success: true, orderId: order.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
