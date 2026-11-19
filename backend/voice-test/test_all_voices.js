// Test all 30 Gemini AI Studio voices using the official @google/genai SDK
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Initialize the client. Make sure GEMINI_API_KEY is set in your environment variables.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const voices = [
  "Puck", "Zephyr", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede", 
  "Callirrhoe", "Autonoe", "Enceladus", "Iapetus", "Ulsmbriel", "Algieba", 
  "Despina", "Erinome", "Algenib", "Rasalgethi", "Laomedeia", "Achernar", 
  "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi", 
  "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat"
];

async function testAllVoices() {
  const outputDir = path.join(process.cwd(), 'voice_tests');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  console.log(`Starting voice generation tests. Audio files will save to: ${outputDir}\n`);

  for (const voice of voices) {
    try {
      console.log(`Generating audio snippet for voice: [${voice}]...`);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Hello! I am the ${voice} voice from Gemini. This is a short audio test to show how I sound.`,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice
              }
            }
          }
        }
      });

      // Find the audio part in the response candidates
      const candidate = response.candidates?.[0];
      const audioPart = candidate?.content?.parts?.find(part => part.inlineData?.mimeType?.startsWith('audio/'));

      if (audioPart && audioPart.inlineData?.data) {
        const audioBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
        
        // Determine extension based on mimeType (usually audio/mp3 or audio/wav)
        const mimeType = audioPart.inlineData.mimeType;
        const extension = mimeType.includes('wav') ? 'wav' : 'mp3';
        
        const fileName = `voice_${voice.toLowerCase()}.${extension}`;
        const filePath = path.join(outputDir, fileName);
        
        fs.writeFileSync(filePath, audioBuffer);
        console.log(`✅ Saved: ${fileName}`);
      } else {
        console.warn(`⚠️ No audio data returned for voice: ${voice}`);
      }
    } catch (error) {
      console.error(`❌ Error generating voice [${voice}]:`, error.message);
    }
    
    // Brief timeout to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\nAll done! Check the "voice_tests" directory to hear the outputs.');
}

testAllVoices();
