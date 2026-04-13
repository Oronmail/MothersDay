import { startSpan, captureException, logger } from './sentry';

// Load Shopify configuration from environment variables
const SHOPIFY_API_VERSION = import.meta.env.VITE_SHOPIFY_API_VERSION || '2025-07';
const SHOPIFY_STORE_PERMANENT_DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const SHOPIFY_STOREFRONT_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;

// Validate required environment variables
if (!SHOPIFY_STORE_PERMANENT_DOMAIN) {
  throw new Error('VITE_SHOPIFY_STORE_DOMAIN environment variable is required');
}
if (!SHOPIFY_STOREFRONT_TOKEN) {
  throw new Error('VITE_SHOPIFY_STOREFRONT_TOKEN environment variable is required');
}

const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

// Main collection handle for fetching all products in manual order
export const MAIN_COLLECTION_HANDLE = 'הכל';

export interface ShopifyProduct {
  node: {
    id: string;
    title: string;
    description: string;
    descriptionHtml?: string;
    handle: string;
    tags: string[];
    vendor: string;
    priceRange: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
    };
    images: {
      edges: Array<{
        node: {
          url: string;
          altText: string | null;
        };
      }>;
    };
    variants: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          price: {
            amount: string;
            currencyCode: string;
          };
          availableForSale: boolean;
          selectedOptions: Array<{
            name: string;
            value: string;
          }>;
        };
      }>;
    };
    options: Array<{
      name: string;
      values: string[];
    }>;
  };
}

export async function storefrontApiRequest(query: string, variables: any = {}) {
  // Extract operation name from query for better tracking
  const operationMatch = query.match(/(?:query|mutation)\s+(\w+)/);
  const operationName = operationMatch ? operationMatch[1] : 'UnknownOperation';

  return startSpan(
    {
      op: 'http.client',
      name: `Shopify GraphQL: ${operationName}`,
      attributes: {
        'shopify.operation': operationName,
        'shopify.api_version': SHOPIFY_API_VERSION,
      },
    },
    async (span) => {
      try {
        logger.debug(`Calling Shopify API: ${operationName}`, { variables });

        const response = await fetch(SHOPIFY_STOREFRONT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN
          },
          body: JSON.stringify({
            query,
            variables,
          }),
        });

        span?.setAttribute('http.status_code', response.status);

        if (response.status === 402) {
          const error = new Error('Shopify API access requires an active billing plan');
          captureException(error, { operationName, variables });
          throw error;
        }

        if (!response.ok) {
          const error = new Error(`HTTP error! status: ${response.status}`);
          captureException(error, { operationName, status: response.status, variables });
          throw error;
        }

        const data = await response.json();

        if (data.errors) {
          const errorMessage = data.errors.map((e: any) => e.message).join(', ');
          const error = new Error(`Error calling Shopify: ${errorMessage}`);
          captureException(error, { operationName, graphqlErrors: data.errors, variables });
          logger.error(`Shopify GraphQL error in ${operationName}`, { errors: data.errors });
          throw error;
        }

        logger.debug(`Shopify API success: ${operationName}`);
        span?.setAttribute('success', true);

        return data;
      } catch (error) {
        span?.setAttribute('success', false);
        throw error;
      }
    }
  );
}

export const STOREFRONT_PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          description
          handle
          tags
          vendor
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url(transform: { maxWidth: 1200, maxHeight: 1500 })
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                availableForSale
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
          options {
            name
            values
          }
        }
      }
    }
  }
`;

export const STOREFRONT_PRODUCT_BY_HANDLE_QUERY = `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      descriptionHtml
      handle
      vendor
      tags
      collections(first: 5) {
        edges {
          node {
            id
            title
            handle
          }
        }
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 15) {
        edges {
          node {
            url(transform: { maxWidth: 1200, maxHeight: 1500 })
            altText
          }
        }
      }
      variants(first: 20) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
            selectedOptions {
              name
              value
            }
          }
        }
      }
      options {
        name
        values
      }
      imageLayout: metafield(namespace: "custom", key: "image_layout") {
        value
      }
    }
  }
`;

export const STOREFRONT_PRODUCT_RECOMMENDATIONS_QUERY = `
  query GetProductRecommendations($productId: ID!) {
    productRecommendations(productId: $productId) {
      id
      title
      description
      handle
      tags
      vendor
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      images(first: 5) {
        edges {
          node {
            url(transform: { maxWidth: 1200, maxHeight: 1500 })
            altText
          }
        }
      }
      variants(first: 10) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
            selectedOptions {
              name
              value
            }
          }
        }
      }
      options {
        name
        values
      }
    }
  }
`;

export interface ShopifyCollection {
  node: {
    id: string;
    title: string;
    handle: string;
  };
}

export const STOREFRONT_COLLECTIONS_QUERY = `
  query GetCollections($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          id
          title
          handle
        }
      }
    }
  }
`;

export const STOREFRONT_COLLECTION_PRODUCTS_QUERY = `
  query GetCollectionProducts($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      products(first: $first) {
        edges {
          node {
            id
            title
            description
            descriptionHtml
            handle
            tags
            vendor
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 5) {
              edges {
                node {
                  url(transform: { maxWidth: 1200, maxHeight: 1500 })
                  altText
                }
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  availableForSale
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
            options {
              name
              values
            }
          }
        }
      }
    }
  }
`;

export const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    title
                    handle
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface CartItem {
  product: ShopifyProduct;
  variantId: string;
  variantTitle: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  quantity: number;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
}

export interface ShippingAddress {
  full_name: string;
  street: string;
  city: string;
  postal_code?: string;
  phone?: string;
}

// Helper to format Israeli phone numbers to international format
function formatPhoneForShopify(phone?: string): string | undefined {
  if (!phone) return undefined;
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with +972
  if (cleaned.startsWith('0')) {
    return `+972${cleaned.substring(1)}`;
  }
  
  // If already starts with 972, add +
  if (cleaned.startsWith('972')) {
    return `+${cleaned}`;
  }
  
  // If already has +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Otherwise assume it's Israeli and needs +972
  return `+972${cleaned}`;
}

export async function createStorefrontCheckout(
  items: CartItem[], 
  userEmail?: string,
  shippingAddress?: ShippingAddress,
  userId?: string
): Promise<string> {
  try {
    const lines = items.map(item => ({
      quantity: item.quantity,
      merchandiseId: item.variantId,
    }));

    const input: any = { 
      lines,
      // Add user_id to cart for better order matching
      note: userId ? `supabase_user_id:${userId}` : undefined,
      attributes: userId ? [
        { key: 'supabase_user_id', value: userId }
      ] : undefined
    };
    
    // Add buyer identity if user email or address is provided
    if (userEmail || shippingAddress) {
      input.buyerIdentity = {};
      
      if (userEmail) {
        input.buyerIdentity.email = userEmail;
      }
      
      if (shippingAddress?.phone) {
        input.buyerIdentity.phone = formatPhoneForShopify(shippingAddress.phone);
      }
      
      // Add delivery address preferences if address is provided
      if (shippingAddress) {
        const nameParts = shippingAddress.full_name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        input.buyerIdentity.deliveryAddressPreferences = [{
          deliveryAddress: {
            address1: shippingAddress.street,
            city: shippingAddress.city,
            country: 'IL',
            firstName,
            lastName,
            phone: formatPhoneForShopify(shippingAddress.phone) || '',
            zip: shippingAddress.postal_code || '',
          }
        }];
      }
    }

    const cartData = await storefrontApiRequest(CART_CREATE_MUTATION, {
      input,
    });

    if (cartData.data.cartCreate.userErrors.length > 0) {
      throw new Error(`Cart creation failed: ${cartData.data.cartCreate.userErrors.map((e: any) => e.message).join(', ')}`);
    }

    const cart = cartData.data.cartCreate.cart;
    
    if (!cart.checkoutUrl) {
      throw new Error('No checkout URL returned from Shopify');
    }

    const url = new URL(cart.checkoutUrl);
    url.searchParams.set('channel', 'online_store');
    return url.toString();
  } catch (error) {
    console.error('Error creating storefront checkout:', error);
    throw error;
  }
}
