import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email sending helper using Resend API directly

interface EmailRequest {
  type: 
    | "seller_approved" 
    | "seller_rejected" 
    | "seller_suspended" 
    | "product_approved" 
    | "product_rejected" 
    | "product_banned"
    | "order_confirmed"
    | "order_shipped"
    | "order_delivered"
    | "order_cancelled"
    | "payment_failed"
    | "low_stock_alert";
  recipientEmail: string;
  recipientName?: string;
  details?: {
    shopName?: string;
    productName?: string;
    reason?: string;
    orderNumber?: string;
    orderTotal?: number;
    trackingNumber?: string;
    courierName?: string;
    productStock?: number;
    threshold?: number;
    paymentMethod?: string;
  };
}

const getEmailContent = (type: string, details: any) => {
  const templates: Record<string, { subject: string; html: string }> = {
    seller_approved: {
      subject: "🎉 Congratulations! Your Seller Account is Approved",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10b981;">Welcome to Our Marketplace!</h1>
          <p>Dear ${details?.recipientName || "Seller"},</p>
          <p>Great news! Your seller account <strong>${details?.shopName || ""}</strong> has been approved.</p>
          <p>You can now:</p>
          <ul>
            <li>Access your Seller Dashboard</li>
            <li>Add and manage products</li>
            <li>Start receiving orders</li>
          </ul>
          <p>Log in to your account to get started!</p>
          <p style="margin-top: 30px;">Best regards,<br/>The Marketplace Team</p>
        </div>
      `,
    },
    seller_rejected: {
      subject: "Seller Application Update",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ef4444;">Seller Application Status</h1>
          <p>Dear ${details?.recipientName || "Applicant"},</p>
          <p>We regret to inform you that your seller application for <strong>${details?.shopName || "your shop"}</strong> has not been approved at this time.</p>
          ${details?.reason ? `<p><strong>Reason:</strong> ${details.reason}</p>` : ""}
          <p>You may reapply after addressing the issues mentioned above.</p>
          <p style="margin-top: 30px;">Best regards,<br/>The Marketplace Team</p>
        </div>
      `,
    },
    seller_suspended: {
      subject: "⚠️ Account Suspension Notice",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f59e0b;">Account Suspended</h1>
          <p>Dear ${details?.recipientName || "Seller"},</p>
          <p>Your seller account <strong>${details?.shopName || ""}</strong> has been temporarily suspended.</p>
          ${details?.reason ? `<p><strong>Reason:</strong> ${details.reason}</p>` : ""}
          <p>Please contact our support team for more information on how to resolve this issue.</p>
          <p style="margin-top: 30px;">Best regards,<br/>The Marketplace Team</p>
        </div>
      `,
    },
    product_approved: {
      subject: "✅ Your Product is Now Live!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10b981;">Product Approved!</h1>
          <p>Dear ${details?.recipientName || "Seller"},</p>
          <p>Your product <strong>${details?.productName || ""}</strong> has been approved and is now live on the marketplace!</p>
          <p>Customers can now view and purchase your product.</p>
          <p style="margin-top: 30px;">Best regards,<br/>The Marketplace Team</p>
        </div>
      `,
    },
    product_rejected: {
      subject: "Product Review Result",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ef4444;">Product Not Approved</h1>
          <p>Dear ${details?.recipientName || "Seller"},</p>
          <p>Your product <strong>${details?.productName || ""}</strong> has not been approved for listing.</p>
          ${details?.reason ? `<p><strong>Reason:</strong> ${details.reason}</p>` : ""}
          <p>Please review our guidelines and make necessary changes before resubmitting.</p>
          <p style="margin-top: 30px;">Best regards,<br/>The Marketplace Team</p>
        </div>
      `,
    },
    product_banned: {
      subject: "⚠️ Product Removed from Marketplace",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ef4444;">Product Removed</h1>
          <p>Dear ${details?.recipientName || "Seller"},</p>
          <p>Your product <strong>${details?.productName || ""}</strong> has been removed from the marketplace.</p>
          ${details?.reason ? `<p><strong>Reason:</strong> ${details.reason}</p>` : ""}
          <p>If you believe this is an error, please contact our support team.</p>
          <p style="margin-top: 30px;">Best regards,<br/>The Marketplace Team</p>
        </div>
      `,
    },
    // New Order Email Templates
    order_confirmed: {
      subject: "✅ Order Confirmed - #${details?.orderNumber || ''}",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10b981;">Order Confirmed!</h1>
          <p>Dear ${details?.recipientName || "Customer"},</p>
          <p>Thank you for your order! Your order <strong>#${details?.orderNumber || ""}</strong> has been confirmed.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order Number:</strong> ${details?.orderNumber || ""}</p>
            <p style="margin: 5px 0 0;"><strong>Total:</strong> ৳${details?.orderTotal?.toLocaleString() || "0"}</p>
          </div>
          <p>We will notify you once your order is shipped.</p>
          <p style="margin-top: 30px;">Best regards,<br/>The MegaMart Team</p>
        </div>
      `,
    },
    order_shipped: {
      subject: "📦 Your Order is On the Way! - #${details?.orderNumber || ''}",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #3b82f6;">Your Order Has Been Shipped!</h1>
          <p>Dear ${details?.recipientName || "Customer"},</p>
          <p>Great news! Your order <strong>#${details?.orderNumber || ""}</strong> is on its way to you.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order Number:</strong> ${details?.orderNumber || ""}</p>
            ${details?.courierName ? `<p style="margin: 5px 0 0;"><strong>Courier:</strong> ${details.courierName}</p>` : ""}
            ${details?.trackingNumber ? `<p style="margin: 5px 0 0;"><strong>Tracking Number:</strong> ${details.trackingNumber}</p>` : ""}
          </div>
          <p>You can track your order in your account dashboard.</p>
          <p style="margin-top: 30px;">Best regards,<br/>The MegaMart Team</p>
        </div>
      `,
    },
    order_delivered: {
      subject: "🎉 Order Delivered! - #${details?.orderNumber || ''}",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10b981;">Your Order Has Been Delivered!</h1>
          <p>Dear ${details?.recipientName || "Customer"},</p>
          <p>Your order <strong>#${details?.orderNumber || ""}</strong> has been delivered successfully.</p>
          <p>We hope you enjoy your purchase! If you have any issues, please don't hesitate to contact us.</p>
          <p>Please consider leaving a review for the products you purchased.</p>
          <p style="margin-top: 30px;">Thank you for shopping with us!<br/>The MegaMart Team</p>
        </div>
      `,
    },
    order_cancelled: {
      subject: "❌ Order Cancelled - #${details?.orderNumber || ''}",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ef4444;">Order Cancelled</h1>
          <p>Dear ${details?.recipientName || "Customer"},</p>
          <p>Your order <strong>#${details?.orderNumber || ""}</strong> has been cancelled.</p>
          ${details?.reason ? `<p><strong>Reason:</strong> ${details.reason}</p>` : ""}
          <p>If you paid online, a refund will be processed within 3-5 business days.</p>
          <p>If you have any questions, please contact our support team.</p>
          <p style="margin-top: 30px;">Best regards,<br/>The MegaMart Team</p>
        </div>
      `,
    },
    payment_failed: {
      subject: "⚠️ Payment Failed - Action Required",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ef4444;">Payment Failed</h1>
          <p>Dear ${details?.recipientName || "Customer"},</p>
          <p>Unfortunately, the payment for your order <strong>#${details?.orderNumber || ""}</strong> was not successful.</p>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
            <p style="margin: 0;"><strong>Order Number:</strong> ${details?.orderNumber || ""}</p>
            <p style="margin: 5px 0 0;"><strong>Amount:</strong> ৳${details?.orderTotal?.toLocaleString() || "0"}</p>
            <p style="margin: 5px 0 0;"><strong>Payment Method:</strong> ${details?.paymentMethod || "N/A"}</p>
          </div>
          <p>Please try again or use a different payment method.</p>
          <p style="margin-top: 30px;">Best regards,<br/>The MegaMart Team</p>
        </div>
      `,
    },
    low_stock_alert: {
      subject: "⚠️ Low Stock Alert - ${details?.productName || 'Product'}",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f59e0b;">Low Stock Alert</h1>
          <p>Dear ${details?.recipientName || "Seller"},</p>
          <p>This is an alert that your product is running low on stock:</p>
          <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
            <p style="margin: 0;"><strong>Product:</strong> ${details?.productName || ""}</p>
            <p style="margin: 5px 0 0;"><strong>Current Stock:</strong> ${details?.productStock || 0} units</p>
            <p style="margin: 5px 0 0;"><strong>Alert Threshold:</strong> ${details?.threshold || 10} units</p>
          </div>
          <p>Please restock this item to avoid missing sales.</p>
          <p style="margin-top: 30px;">Best regards,<br/>The MegaMart Team</p>
        </div>
      `,
    },
  };

  return templates[type] || { subject: "Notification", html: "<p>You have a new notification.</p>" };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, recipientEmail, recipientName, details }: EmailRequest = await req.json();

    if (!recipientEmail || !type) {
      throw new Error("Missing required fields: type, recipientEmail");
    }

    const emailContent = getEmailContent(type, { ...details, recipientName });

    // Check if RESEND_API_KEY is configured
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.warn("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "Email skipped - API key not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Marketplace <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    const emailData = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error("Email send failed:", emailData);
      return new Response(
        JSON.stringify({ success: false, error: emailData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
