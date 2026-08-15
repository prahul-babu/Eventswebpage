import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  CreditCard,
  ShieldCheck,
  Calendar,
  MapPin,
  Lock,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Ticket,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useStudentRegistrations } from "@/lib/queries/registrations";
import {
  useCreatePaymentOrder,
  useVerifyPayment,
  loadRazorpayScript,
} from "@/lib/queries/payments";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const CheckoutPage: React.FC = () => {
  const { registrationId } = useParams<{ registrationId: string }>();
  const navigate = useNavigate();
  const { firebaseUser, profile } = useAuth();

  const { data: regsData, isLoading: isRegLoading } = useStudentRegistrations(firebaseUser?.uid);
  const targetItem = regsData?.all.find((i) => i.registration.id === registrationId);

  const createOrderMutation = useCreatePaymentOrder();
  const verifyPaymentMutation = useVerifyPayment();

  const [isVerifying, setIsVerifying] = useState(false);
  const [isOpeningGateway, setIsOpeningGateway] = useState(false);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  // If already confirmed, redirect to ticket pass
  useEffect(() => {
    if (targetItem && targetItem.registration.status === "CONFIRMED") {
      navigate(`/tickets/${registrationId}`, { replace: true });
    }
  }, [targetItem, registrationId, navigate]);

  const handlePayNow = async () => {
    if (!targetItem || !registrationId) return;

    try {
      setIsOpeningGateway(true);

      // 1. Create order on server (reads fee from event document)
      const orderResponse = await createOrderMutation.mutateAsync({ registrationId });

      // 2. Configure Razorpay Standard Checkout options
      const studentName = profile?.displayName || firebaseUser?.displayName || "Apollo Student";
      const studentEmail = profile?.email || firebaseUser?.email || "";
      const studentPhone = profile?.phoneNumber || targetItem.registration.userPhone || "";

      const options = {
        key: orderResponse.razorpayKeyId,
        amount: orderResponse.amount,
        currency: orderResponse.currency || "INR",
        name: "The Apollo University",
        description: `Pass for ${orderResponse.eventTitle}`,
        order_id: orderResponse.orderId,
        prefill: {
          name: studentName,
          email: studentEmail,
          contact: studentPhone,
        },
        theme: {
          color: "#312E81",
        },
        modal: {
          ondismiss: () => {
            setIsOpeningGateway(false);
            toast.info("Payment Cancelled", {
              description: "You closed the checkout modal. You can retry when ready.",
            });
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setIsOpeningGateway(false);
          setIsVerifying(true);

          try {
            // 3. Verify server-side with HMAC SHA256
            const verifyResult = await verifyPaymentMutation.mutateAsync({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyResult.success) {
              navigate(`/tickets/${registrationId}`);
            }
          } catch (err: any) {
            setIsVerifying(false);
            toast.error("Verification Failed", {
              description: err.message || "Failed to confirm payment with banking servers.",
            });
          }
        },
      };

      // 4. Open Razorpay Modal or fallback for mock development
      if (typeof (window as any).Razorpay === "function") {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        setIsOpeningGateway(false);
        setIsVerifying(true);
        const mockVerify = await verifyPaymentMutation.mutateAsync({
          razorpayOrderId: orderResponse.orderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: "mock_signature_test",
        });
        if (mockVerify.success) {
          navigate(`/tickets/${registrationId}`);
        }
      }
    } catch (err: any) {
      setIsOpeningGateway(false);
      toast.error("Checkout Error", {
        description: err.message || "Unable to initialize checkout session.",
      });
    }
  };

  if (isRegLoading) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading checkout summary...</p>
      </div>
    );
  }

  if (!targetItem) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto stroke-1" />
        <h2 className="text-xl font-bold text-slate-900">Registration Not Found</h2>
        <p className="text-xs text-slate-500">
          The booking session may have expired or is invalid.
        </p>
        <Button asChild variant="outline" className="rounded-xl text-xs">
          <Link to="/events">Browse Events</Link>
        </Button>
      </div>
    );
  }

  const { event, registration } = targetItem;
  const baseFee = event.price || 0;
  const convenienceFee = 0;
  const totalAmount = baseFee + convenienceFee;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back Link */}
      <Link
        to={`/events/${event.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Event Details</span>
      </Link>

      <div className="space-y-2 text-left">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Complete Your Registration
        </h1>
        <p className="text-xs text-slate-500">
          Review your pass details and complete payment via Razorpay institutional gateway.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left: Event Summary (3 Cols) */}
        <div className="md:col-span-3 space-y-4">
          <Card className="border-slate-200/90 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                  {event.bannerUrl ? (
                    <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-950 to-indigo-700 flex items-center justify-center text-white">
                      <Ticket className="w-6 h-6 text-amber-300" />
                    </div>
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <Badge variant="indigo" className="text-[10px] py-0 px-1.5 uppercase">
                    {event.category}
                  </Badge>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                    {event.title}
                  </h3>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{format(event.startAt, "EEEE, MMMM d, yyyy &bull; h:mm a")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">{event.venueLocation}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Student Profile Snapshot */}
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-slate-50/60">
            <CardContent className="p-4 space-y-2 text-xs text-slate-600">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Ticket Issued To</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-400">Attendee:</span>
                  <div className="font-semibold text-slate-900">{registration.userDisplayName}</div>
                </div>
                <div>
                  <span className="text-slate-400">Roll Number:</span>
                  <div className="font-semibold text-slate-900">{registration.userRollNumber || "N/A"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Payment Breakdown Card (2 Cols) */}
        <div className="md:col-span-2">
          <Card className="border-slate-200 shadow-lg rounded-2xl overflow-hidden bg-white sticky top-20">
            <CardHeader className="p-5 bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white">
              <CardTitle className="text-base font-bold text-white">Payment Summary</CardTitle>
              <CardDescription className="text-[11px] text-indigo-200">
                Official Razorpay Checkout
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs text-slate-700">
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Registration Ticket</span>
                  <span className="font-semibold text-slate-900">₹{baseFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>University Convenience Fee</span>
                  <span className="font-semibold text-emerald-600">FREE (₹0.00)</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-lg font-extrabold text-indigo-900">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  size="lg"
                  onClick={handlePayNow}
                  disabled={isOpeningGateway || isVerifying || createOrderMutation.isPending}
                  className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md gap-2"
                >
                  {isOpeningGateway ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opening Secure Gateway...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Pay Now &bull; ₹{totalAmount.toFixed(2)}</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium text-center">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>256-bit Encrypted SSL Gateway &bull; Razorpay</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full-Screen Verifying Overlay */}
      {isVerifying && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center text-white space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-2xl">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              Verifying Your Payment...
            </h2>
            <p className="text-xs text-indigo-200 leading-relaxed">
              Confirming transaction with bank and university ticketing records. Please do not refresh or close this tab.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
export default CheckoutPage;
