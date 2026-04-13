import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Minus, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import shoppingBagIcon from "@/assets/shopping-bag-icon.png";
import { useCartStore } from "@/stores/cartStore";
import { supabase } from "@/lib/supabase";
import { ShippingAddress } from "@/lib/types";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { LazyImage } from "./LazyImage";

export const CartDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [defaultAddress, setDefaultAddress] = useState<ShippingAddress | undefined>();
  const { user } = useAuth();
  
  const {
    items,
    isLoading,
    updateQuantity,
    removeItem,
    createOrder
  } = useCartStore();
  
  // Get user email and default address when user is available
  useEffect(() => {
    const getUserData = async () => {
      if (user) {
        setUserEmail(user.email);
        
        // Fetch default address
        const { data: addresses } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .limit(1);
        
        if (addresses && addresses.length > 0) {
          const addr = addresses[0];
          setDefaultAddress({
            full_name: addr.full_name,
            street: addr.street,
            city: addr.city,
            postal_code: addr.postal_code || undefined,
            phone: addr.phone || undefined,
          });
        }
      }
    };
    getUserData();
  }, [user]);
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + parseFloat(item.price.amount) * item.quantity, 0);

  const handleCheckout = async () => {
    if (!userEmail || !defaultAddress) {
      toast.error('חסרים פרטים', {
        description: 'יש להתחבר ולהוסיף כתובת למשלוח'
      });
      return;
    }

    const loadingToast = toast.loading('יוצר הזמנה...', {
      description: 'אנא המתן'
    });

    try {
      const { orderNumber } = await createOrder(userEmail, defaultAddress, user?.id);

      toast.dismiss(loadingToast);
      toast.success('ההזמנה נוצרה בהצלחה!', {
        description: `מספר הזמנה: ${orderNumber}`
      });
      setIsOpen(false);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Order creation failed:', error);

      let errorMessage = 'אנא נסה שנית';
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage = 'בעיית תקשורת. בדוק את החיבור לאינטרנט';
      }

      toast.error('יצירת ההזמנה נכשלה', {
        description: errorMessage
      });
    }
  };
  return <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative p-0">
          <img src={shoppingBagIcon} alt="Shopping bag" className="h-6 w-6 md:h-[30px] md:w-[30px]" />
          {totalItems > 0 && <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {totalItems}
            </Badge>}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full" dir="rtl">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>עגלת קניות</SheetTitle>
          <SheetDescription>
            {totalItems === 0 ? "העגלה ריקה" : `${totalItems} פריטים בעגלה`}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col flex-1 pt-6 min-h-0">
          {items.length === 0 ? <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <img src={shoppingBagIcon} alt="Empty cart" className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">העגלה שלך ריקה</p>
              </div>
            </div> : <>
              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                <div className="space-y-4">
                  {items.map(item => <div key={item.variantId} className="flex gap-4 p-2">
                      <div className="w-16 h-16 bg-secondary/20 overflow-hidden flex-shrink-0">
                        {item.product.node.images?.edges?.[0]?.node && (
                          <LazyImage 
                            src={item.product.node.images.edges[0].node.url} 
                            alt={item.product.node.title} 
                          />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.product.node.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.selectedOptions.map(option => option.value).join(' • ')}
                        </p>
                        <p className="">
                          ₪{parseFloat(item.price.amount).toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(item.variantId)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.variantId, item.quantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.variantId, item.quantity - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>)}
                </div>
              </div>
              
              <div className="flex-shrink-0 space-y-4 pt-4 border-t bg-background">
                <div className="flex justify-between items-center">
                  <span className="text-lg">סה"כ</span>
                  <span className="text-xl">
                    ₪{totalPrice.toFixed(2)}
                  </span>
                </div>
                
                <Button onClick={handleCheckout} className="w-full" size="lg" disabled={items.length === 0 || isLoading}>
                  {isLoading ? <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      יוצר הזמנה...
                    </> : <>
                      <ExternalLink className="w-4 h-4 ml-2" />
                      מעבר לתשלום
                    </>}
                </Button>
              </div>
            </>}
        </div>
      </SheetContent>
    </Sheet>;
};