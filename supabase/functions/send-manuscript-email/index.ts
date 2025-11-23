import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    
    const title = formData.get("title") as string;
    const manuscriptType = formData.get("manuscript_type") as string;
    const abstract = formData.get("abstract") as string;
    const keywords = formData.get("keywords") as string;
    const correspondingAuthor = formData.get("corresponding_author_name") as string;
    const email = formData.get("corresponding_author_email") as string;
    const affiliation = formData.get("corresponding_author_affiliation") as string;
    const orcid = formData.get("corresponding_author_orcid") as string;
    const allAuthors = formData.get("all_authors") as string;
    const coverLetter = formData.get("cover_letter") as string;

    // Get all files
    const files = formData.getAll("files");
    const attachments = [];

    for (const file of files) {
      if (file instanceof File) {
        const buffer = await file.arrayBuffer();
        const base64Content = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        
        attachments.push({
          filename: file.name,
          content: base64Content,
        });
      }
    }

    console.log("Sending email with", attachments.length, "attachments");

    const emailResponse = await resend.emails.send({
      from: "Marine Notes Journal <onboarding@resend.dev>",
      to: ["editor@marinenotesjournal.com"],
      subject: `New Manuscript Submission: ${title}`,
      html: `
        <h2>New Manuscript Submission</h2>
        <h3>Manuscript Details</h3>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>Type:</strong> ${manuscriptType || "Not specified"}</p>
        <p><strong>Keywords:</strong> ${keywords}</p>
        
        <h3>Author Information</h3>
        <p><strong>Corresponding Author:</strong> ${correspondingAuthor}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Affiliation:</strong> ${affiliation}</p>
        <p><strong>ORCID:</strong> ${orcid || "Not provided"}</p>
        <p><strong>All Authors:</strong> ${allAuthors}</p>
        
        <h3>Abstract</h3>
        <p>${abstract}</p>
        
        ${coverLetter ? `<h3>Cover Letter</h3><p>${coverLetter}</p>` : ""}
      `,
      attachments: attachments,
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
    console.error("Error in send-manuscript-email function:", error);
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
