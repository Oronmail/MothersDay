import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight } from "lucide-react";
import smileyIcon from "@/assets/smiley-icon.png";
import homeIcon from "@/assets/home-icon.png";
import clockIcon from "@/assets/clock-icon.png";
import shoppingBagIcon from "@/assets/shopping-bag-icon.png";
import heartIcon from "@/assets/heart-icon.png";
import { ROUTES } from "@/lib/routes";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Separator } from "@/components/ui/separator";
import { AddressManager } from "@/components/AddressManager";
import { useAuth } from "@/hooks/useAuth";

const profileSchema = z.object({
  full_name: z.string().trim().max(100, "השם חייב להיות פחות מ-100 תווים").optional(),
  phone: z.string().trim().max(20, "הטלפון חייב להיות פחות מ-20 תווים").optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      phone: "",
    },
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (authLoading) return;
      
      if (!user) {
        navigate(ROUTES.auth);
        return;
      }

      // Fetch profile data
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        toast({
          title: "שגיאה",
          description: "נכשל בטעינת הפרופיל",
          variant: "destructive",
        });
      } else if (profile) {
        form.reset({
          full_name: profile.full_name || "",
          phone: profile.phone || "",
        });
      }

      setLoading(false);
    };

    loadProfile();
  }, [user, authLoading, navigate, toast, form]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name || null,
        phone: data.phone || null,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "שגיאה",
        description: "נכשל בעדכון הפרופיל",
        variant: "destructive",
      });
    } else {
      toast({
        title: "הצלחה",
        description: "הפרופיל עודכן בהצלחה",
      });
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Mobile: stacked. Desktop: profile settings beside addresses + quick links. */}
        <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <img src={smileyIcon} alt="" className="h-6 w-6" />
                <CardTitle>הגדרות פרופיל</CardTitle>
              </div>
              <CardDescription>נהל את המידע האישי שלך</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
                  <div className="space-y-6 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm">אימייל</label>
                    <Input value={user?.email || ""} disabled className="bg-muted" dir="ltr" />
                    <p className="text-xs text-muted-foreground">לא ניתן לשנות את האימייל</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>שם מלא</FormLabel>
                        <FormControl>
                          <Input placeholder="הזן את שמך המלא" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>מספר טלפון</FormLabel>
                        <FormControl>
                          <Input placeholder="הזן את מספר הטלפון שלך" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>

                  <Button type="submit" disabled={saving} className="w-full mt-auto">
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        שומר...
                      </>
                    ) : (
                      "שמור שינויים"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <img src={homeIcon} alt="" className="h-6 w-6" />
                <CardTitle>כתובות למשלוח</CardTitle>
              </div>
              <CardDescription>נהל את כתובות המשלוח שלך</CardDescription>
            </CardHeader>
            <CardContent>
              {user && <AddressManager userId={user.id} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <img src={clockIcon} alt="" className="h-6 w-6" />
                <CardTitle>קישורים מהירים</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to={ROUTES.orders}>
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <img src={shoppingBagIcon} alt="" className="h-4 w-4" />
                    <span>היסטוריית הזמנות</span>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={ROUTES.wishlist}>
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <img src={heartIcon} alt="" className="h-4 w-4" />
                    <span>רשימת משאלות</span>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
