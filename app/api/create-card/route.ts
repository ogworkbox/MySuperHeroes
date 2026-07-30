import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, archetype, element, rarity, power, speed, defense, magic, moveName, moveDesc } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized user ID' }, { status: 401 });
    }

    // Create a fun comic book prompt for the superhero card
    const imagePrompt = `A dynamic vibrant comic book trading card illustration of a superhero named ${name}, archetype ${archetype}, element ${element}, cartoon art style, detailed collector card art`;
    
    // Use Pollinations.ai free image generator endpoint (no API key required)
    const cardImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=512&height=512&nologo=true`;

    // Initialize the Supabase client using your service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bXZveWx0bHpnbGhrdG5laXlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTMxNDQ0MywiZXhwIjoyMTAwODkwNDQzfQ.CcG-IddEeAsORMuUSRlR8YkHlrq2gwGWH5__Q5GJXfk'
    );

    // Insert the card into Supabase
    const { error: insertError } = await supabaseAdmin
      .from('cards')
      .insert([
        {
          user_id: userId,
          name,
          archetype,
          element,
          rarity,
          power,
          speed,
          defense,
          magic,
          move_name: moveName,
          move_desc: moveDesc,
          image_url: cardImageUrl
        }
      ]);

    if (insertError) {
      throw new Error(insertError.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API create-card error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}