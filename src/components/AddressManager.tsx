import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Star, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

const addressSchema = z.object({
  full_name: z.string().trim().min(2, "השם חייב להכיל לפחות 2 תווים").max(100, "השם חייב להיות פחות מ-100 תווים"),
  street: z.string().trim().min(3, "הרחוב חייב להכיל לפחות 3 תווים").max(200, "הרחוב חייב להיות פחות מ-200 תווים"),
  city: z.string().trim().min(2, "העיר חייבת להכיל לפחות 2 תווים").max(100, "העיר חייבת להיות פחות מ-100 תווים"),
  postal_code: z.string().trim().max(20, "המיקוד חייב להיות פחות מ-20 תווים").optional(),
  phone: z.string().trim().max(20, "הטלפון חייב להיות פחות מ-20 תווים").optional(),
  label: z.string().trim().max(50, "התווית חייבת להיות פחות מ-50 תווים").optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface Address extends AddressFormData {
  id: string;
  is_default: boolean;
  created_at: string;
}

interface AddressManagerProps {
  userId: string;
}

export const AddressManager = ({ userId }: AddressManagerProps) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      full_name: "",
      street: "",
      city: "",
      postal_code: "",
      phone: "",
      label: "בית",
    },
  });

  const loadAddresses = async () => {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "שגיאה",
        description: "נכשל בטעינת הכתובות",
        variant: "destructive",
      });
    } else {
      setAddresses(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const onSubmit = async (data: AddressFormData) => {
    setSaving(true);

    try {
      if (editingAddress) {
        const { error } = await supabase
          .from("addresses")
          .update({
            full_name: data.full_name,
            street: data.street,
            city: data.city,
            postal_code: data.postal_code || null,
            phone: data.phone || null,
            label: data.label || "בית",
          })
          .eq("id", editingAddress.id)
          .eq("user_id", userId);

        if (error) throw error;

        toast({
          title: "הצלחה",
          description: "הכתובת עודכנה בהצלחה",
        });
      } else {
        const { error } = await supabase
          .from("addresses")
          .insert({
            user_id: userId,
            full_name: data.full_name,
            street: data.street,
            city: data.city,
            postal_code: data.postal_code || null,
            phone: data.phone || null,
            label: data.label || "בית",
            is_default: addresses.length === 0,
          });

        if (error) throw error;

        toast({
          title: "הצלחה",
          description: "הכתובת נוספה בהצלחה",
        });
      }

      await loadAddresses();
      setIsDialogOpen(false);
      setEditingAddress(null);
      form.reset();
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל בשמירת הכתובת",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId);

      const { error } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", addressId)
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "הצלחה",
        description: "כתובת ברירת המחדל עודכנה",
      });

      await loadAddresses();
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל בהגדרת כתובת ברירת מחדל",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", deletingId)
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "הצלחה",
        description: "הכתובת נמחקה בהצלחה",
      });

      await loadAddresses();
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל במחיקת הכתובת",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const openEditDialog = (address: Address) => {
    setEditingAddress(address);
    form.reset({
      full_name: address.full_name,
      street: address.street,
      city: address.city,
      postal_code: address.postal_code || "",
      phone: address.phone || "",
      label: address.label || "בית",
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingAddress(null);
    form.reset({
      full_name: "",
      street: "",
      city: "",
      postal_code: "",
      phone: "",
      label: "בית",
    });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg">כתובות למשלוח</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} variant="outline" size="sm">
              <Plus className="h-4 w-4 ml-2" />
              הוסף כתובת
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {editingAddress ? "ערוך כתובת" : "הוסף כתובת חדשה"}
              </DialogTitle>
              <DialogDescription>
                {editingAddress ? "עדכן את פרטי הכתובת" : "הוסף כתובת משלוח חדשה"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שם מלא</FormLabel>
                      <FormControl>
                        <Input placeholder="ישראל ישראלי" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>תווית (אופציונלי)</FormLabel>
                      <FormControl>
                        <Input placeholder="בית, עבודה, וכו'" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>כתובת רחוב</FormLabel>
                      <FormControl>
                        <Input placeholder="רחוב הרצל 123, דירה 4ב" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>עיר</FormLabel>
                        <FormControl>
                          <Input placeholder="תל אביב" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>מיקוד (אופציונלי)</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>טלפון (אופציונלי)</FormLabel>
                      <FormControl>
                        <Input placeholder="050-123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        שומר...
                      </>
                    ) : (
                      editingAddress ? "עדכן כתובת" : "הוסף כתובת"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingAddress(null);
                      form.reset();
                    }}
                  >
                    ביטול
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground text-center mb-4">
              לא נשמרו כתובות עדיין
            </p>
            <Button onClick={openAddDialog} variant="outline" size="sm">
              <Plus className="h-4 w-4 ml-2" />
              הוסף כתובת ראשונה
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <Card key={address.id} className={address.is_default ? "border-primary" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="">{address.full_name}</span>
                      {address.label && (
                        <Badge variant="secondary" className="text-xs">{address.label}</Badge>
                      )}
                      {address.is_default && (
                        <Badge className="gap-1 text-xs">
                          <Star className="h-3 w-3 fill-current" />
                          ברירת מחדל
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>{address.street}</div>
                      <div>
                        {address.city}
                        {address.postal_code && `, ${address.postal_code}`}
                      </div>
                      {address.phone && <div>טלפון: {address.phone}</div>}
                    </div>
                    {!address.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                        className="mt-2 h-8"
                      >
                        <Star className="h-3 w-3 ml-2" />
                        הגדר כברירת מחדל
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(address)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeletingId(address.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחק כתובת</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק כתובת זו? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};