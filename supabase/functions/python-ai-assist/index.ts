import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, model, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "review") {
      systemPrompt = `You are a friendly Python AI coding tutor for teens (ages 12-20). Review Python code and give clear, encouraging feedback. Focus on:
- Bugs or errors
- Code style improvements
- AI/ML best practices
Keep responses concise (under 200 words). Use simple language. Format with markdown.`;
      userPrompt = `Review this Python code:\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "explain") {
      systemPrompt = `You are a friendly Python AI coding tutor for teens (ages 12-20). Explain code in simple terms that a beginner can understand. Use analogies and examples. Keep it under 150 words.`;
      userPrompt = `Explain this Python code:\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "suggest") {
      systemPrompt = `You are a friendly Python AI coding tutor for teens (ages 12-20). Suggest improvements or next steps for the code. Give 2-3 actionable suggestions. Keep it under 150 words.`;
      userPrompt = `Suggest improvements for this Python code:\n\n\`\`\`python\n${code}\n\`\`\``;
    } else if (action === "generate") {
      systemPrompt = `You are a friendly Python AI coding tutor for teens (ages 12-20). Generate clean, well-commented Python code based on the description. Use the specified AI model/library if mentioned. Return ONLY the Python code in a code block.`;
      userPrompt = `Generate Python code for: ${code}\n\nUse model/library: ${model || "any appropriate one"}`;
    } else if (action === "idea-to-code") {
      systemPrompt = `You are a friendly Python AI coding tutor for teens (ages 12-20). The student will describe an AI project idea. Generate a complete, working Python starter project with:
- Clear comments explaining each section
- All necessary imports
- A main function or script that runs
- Sample data or placeholders
- Print statements showing output
Return the code inside a \`\`\`python code block. Keep it under 60 lines. Use simple, beginner-friendly code.`;
      userPrompt = `Create a Python AI project for this idea: ${code}`;
    } else if (action === "visual-builder") {
      systemPrompt = `You are a Python AI coding tutor. Generate training code for an AI model based on the data type and model type described. Include:
- Data loading
- Model setup
- Training loop
- Accuracy evaluation
- Clear comments
Return code in a \`\`\`python block.`;
      userPrompt = `Generate Python training code for: ${code}\nModel type: ${model || "auto-detect"}`;
    } else if (action === "generate-ui") {
      systemPrompt = `You are a Python AI coding tutor for teens (ages 12-20). Generate a complete, working Streamlit web app that demonstrates an AI model.

The app MUST include:
- A clear title and description
- File upload widget (st.file_uploader) for the appropriate data type
- Model loading and inference
- Visual output display (st.image, st.bar_chart, st.write as appropriate)
- A sidebar with model info and settings
- Error handling with st.error
- Beautiful styling with st.set_page_config and custom CSS
- Sample/demo mode when no file is uploaded

Return ONLY the Python code in a \`\`\`python code block. Keep it under 80 lines. Use clear comments.`;
      userPrompt = `Generate a Streamlit web UI for this AI model: ${code}\nModel type: ${model || "image classifier"}`;
    } else {
      systemPrompt = `You are a friendly Python AI coding tutor for teens (ages 12-20). Help with any Python AI coding question. Keep responses concise and encouraging.`;
      userPrompt = code;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("python-ai-assist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
