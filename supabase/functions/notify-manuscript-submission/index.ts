import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmissionNotification {
  title: string;
  manuscript_type: string;
  corresponding_author_name: string;
  corresponding_author_email: string;
  corresponding_author_affiliation: string;
  abstract: string;
  keywords: string;
  submission_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const submission: SubmissionNotification = await req.json();
    
    console.log("Sending manuscript submission notification for:", submission.title);

    const emailResponse = await resend.emails.send({
      from: "Marine Notes Journal <onboarding@resend.dev>",
      to: ["editor@marinenotesjournal.com"],
      subject: `New Manuscript Submission: ${submission.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0066cc;">New Manuscript Submission</h1>
          
          <h2 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">Manuscript Details</h2>
          <p><strong>Title:</strong> ${submission.title}</p>
          <p><strong>Type:</strong> ${submission.manuscript_type}</p>
          <p><strong>Submission ID:</strong> ${submission.submission_id}</p>
          
          <h2 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">Corresponding Author</h2>
          <p><strong>Name:</strong> ${submission.corresponding_author_name}</p>
          <p><strong>Email:</strong> ${submission.corresponding_author_email}</p>
          <p><strong>Affiliation:</strong> ${submission.corresponding_author_affiliation}</p>
          
          <h2 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">Abstract</h2>
          <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">${submission.abstract}</p>
          
          <h2 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">Keywords</h2>
          <p>${submission.keywords}</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="color: #666; font-size: 14px;">
            Please log in to the editorial dashboard to review the full submission and associated files.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending manuscript notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
