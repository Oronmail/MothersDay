import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Minus, Plus, Trash2, ExternalLink } from "lucide-react";
import shoppingBagIcon from "@/assets/shopping-bag-icon.png";
import { useCartStore } from "@/stores/cartStore";
import { ROUTES } from "@/lib/routes";
import { LazyImage } from "./LazyImage";

export const CartDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const {
    items,
    updateQuantity,
    removeItem,
  } = useCartStore();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + parseFloat(item.price.amount) * item.quantity, 0);

  const handleCheckout = () => {
    setIsOpen(false);
    navigate(ROUTES.checkout);
  };
  return <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative p-0" aria-label="פתחי את עגלת הקניות">
          <img src={shoppingBagIcon} alt="" aria-hidden="true" className="h-6 w-6 md:h-[30px] md:w-[30px]" />
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeItem(item.variantId)}
                          aria-label={`הסירי את ${item.product.node.title} מהעגלה`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            aria-label={`הגדילי כמות עבור ${item.product.node.title}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            aria-label={`הפחיתי כמות עבור ${item.product.node.title}`}
                          >
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
                
                <Button onClick={handleCheckout} className="w-full" size="lg" disabled={items.length === 0}>
                  <ExternalLink className="w-4 h-4 ml-2" />
                  מעבר לתשלום
                </Button>
              </div>
            </>}
        </div>
      </SheetContent>
    </Sheet>;
};
