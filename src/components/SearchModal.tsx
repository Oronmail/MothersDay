import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { storefrontApiRequest, STOREFRONT_PRODUCTS_QUERY, ShopifyProduct } from "@/lib/shopify";
import { buildProductPath } from "@/lib/routes";
import searchIcon from "@/assets/search-icon.png";
export const SearchModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const {
    data: products,
    isLoading
  } = useQuery({
    queryKey: ['all-products-search'],
    queryFn: async () => {
      const response = await storefrontApiRequest(STOREFRONT_PRODUCTS_QUERY, {
        first: 100
      });
      return response.data.products.edges as ShopifyProduct[];
    },
    enabled: isOpen
  });
  const filteredProducts = useMemo(() => {
    if (!products || !searchQuery.trim()) return products || [];
    const query = searchQuery.toLowerCase().trim();
    return products.filter(product => {
      const title = product.node.title.toLowerCase();
      const description = product.node.description?.toLowerCase() || "";
      const tags = product.node.tags?.map(t => t.toLowerCase()).join(" ") || "";
      return title.includes(query) || description.includes(query) || tags.includes(query);
    });
  }, [products, searchQuery]);
  const handleProductClick = (handle: string) => {
    navigate(buildProductPath(handle));
    setIsOpen(false);
    setSearchQuery("");
  };
  const handleClear = () => {
    setSearchQuery("");
  };
  return <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="p-0">
          <img src={searchIcon} alt="חיפוש" className="h-6 w-6 md:h-[30px] md:w-[30px]" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-right" dir="rtl">חיפוש מוצרים</DialogTitle>
        </DialogHeader>
        
        {/* Search Input */}
        <div className="px-4 py-3 border-b">
        <div className="relative" dir="rtl">
            <img src={searchIcon} alt="" className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
            <Input placeholder="חפש מוצרים..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pr-10 pl-10 text-right" autoFocus />
            {searchQuery && <Button variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {isLoading ? <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div> : filteredProducts.length === 0 ? <div className="text-center py-8 text-muted-foreground" dir="rtl">
              {searchQuery ? "לא נמצאו מוצרים" : "התחל להקליד לחיפוש"}
            </div> : <div className="space-y-2" dir="rtl">
              {searchQuery && <p className="text-sm text-muted-foreground mb-3">
                  {filteredProducts.length} תוצאות
                </p>}
              {filteredProducts.map(product => <button key={product.node.id} onClick={() => handleProductClick(product.node.handle)} className="w-full flex items-center gap-3 p-2 hover:bg-secondary/30 transition-colors text-right">
                  <div className="w-12 h-12 overflow-hidden bg-secondary/20 flex-shrink-0">
                    {product.node.images?.edges?.[0]?.node && <img src={product.node.images.edges[0].node.url} alt={product.node.title} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{product.node.title}</h4>
                    <p className="text-sm text-primary">
                      ₪{parseFloat(product.node.priceRange.minVariantPrice.amount).toFixed(0)}
                    </p>
                  </div>
                </button>)}
            </div>}
        </div>
      </DialogContent>
    </Dialog>;
};