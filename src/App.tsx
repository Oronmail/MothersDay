import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Lazy load all page components
const UnderConstruction = lazy(() => import("./pages/UnderConstruction"));
const SiteAccess = lazy(() => import("./pages/SiteAccess"));
const Index = lazy(() => import("./pages/Index"));
const AllProducts = lazy(() => import("./pages/AllProducts"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Collection = lazy(() => import("./pages/Collection"));
const About = lazy(() => import("./pages/About"));
const Blog = lazy(() => import("./pages/Blog"));
const Content1 = lazy(() => import("./pages/Content1"));
const Content2 = lazy(() => import("./pages/Content2"));
const Content3 = lazy(() => import("./pages/Content3"));
const Shipping = lazy(() => import("./pages/Shipping"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Returns = lazy(() => import("./pages/Returns"));
const Support = lazy(() => import("./pages/Support"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const Orders = lazy(() => import("./pages/Orders"));
const AllSets = lazy(() => import("./pages/AllSets"));
const Wishlist = lazy(() => import("./pages/Wishlist"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<UnderConstruction />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/site" element={<SiteAccess />}>
                <Route index element={<Index />} />
                <Route path="products" element={<AllProducts />} />
                <Route path="sets" element={<AllSets />} />
                <Route path="profile" element={<Profile />} />
                <Route path="orders" element={<Orders />} />
                <Route path="wishlist" element={<Wishlist />} />
                <Route path="product/:handle" element={<ProductDetail />} />
                <Route path="collection/:handle" element={<Collection />} />
                <Route path="about" element={<About />} />
                <Route path="blog" element={<Blog />} />
                <Route path="content-1" element={<Content1 />} />
                <Route path="content-2" element={<Content2 />} />
                <Route path="content-3" element={<Content3 />} />
                <Route path="shipping" element={<Shipping />} />
                <Route path="privacy" element={<Privacy />} />
                <Route path="terms" element={<Terms />} />
                <Route path="returns" element={<Returns />} />
                <Route path="support" element={<Support />} />
              </Route>
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
