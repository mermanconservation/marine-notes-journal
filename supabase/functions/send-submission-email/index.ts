import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SubmissionEmailRequest {
  title: string;
  manuscriptType: string;
  correspondingAuthor: string;
  email: string;
  institution: string;
  orcid: string;
  authors: string;
  abstract: string;
  keywords: string;
  coverLetter: string;
  filePaths: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const submissionData: SubmissionEmailRequest = await req.json();

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download files from storage and prepare attachments
    const attachments = [];
    for (const filePath of submissionData.filePaths) {
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('manuscripts')
        .download(filePath);

      if (downloadError) {
        console.error(`Error downloading file ${filePath}:`, downloadError);
        continue;
      }

      // Convert blob to buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      
      // Get filename from path
      const filename = filePath.split('-').slice(1).join('-');

      attachments.push({
        filename: filename,
        content: buffer,
      });
    }

    // Send email with Resend
    const emailResponse = await resend.emails.send({
      from: "Marine Notes Journal <onboarding@resend.dev>",
      to: ["marinenotesjournal@gmail.com"],
      replyTo: submissionData.email,
      subject: `New Manuscript Submission: ${submissionData.title}`,
      html: `
        <h1>New Manuscript Submission</h1>
        
        <h2>Manuscript Information</h2>
        <p><strong>Title:</strong> ${submissionData.title}</p>
        <p><strong>Type:</strong> ${submissionData.manuscriptType}</p>
        
        <h2>Author Information</h2>
        <p><strong>Corresponding Author:</strong> ${submissionData.correspondingAuthor}</p>
        <p><strong>Email:</strong> ${submissionData.email}</p>
        <p><strong>Institution:</strong> ${submissionData.institution}</p>
        <p><strong>ORCID:</strong> ${submissionData.orcid || 'Not provided'}</p>
        
        <h2>All Authors</h2>
        <p>${submissionData.authors.replace(/\n/g, '<br>')}</p>
        
        <h2>Abstract</h2>
        <p>${submissionData.abstract}</p>
        
        <h2>Keywords</h2>
        <p>${submissionData.keywords}</p>
        
        ${submissionData.coverLetter ? `
        <h2>Cover Letter</h2>
        <p>${submissionData.coverLetter.replace(/\n/g, '<br>')}</p>
        ` : ''}
        
        <p style="margin-top: 30px; color: #666;">
          This submission was received via the Marine Notes Journal submission system.
        </p>
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
    console.error("Error in send-submission-email function:", error);
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
