import os
import json
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
import pdfplumber
import io
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configure Gemini
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise ValueError("GEMINI_API_KEY is not set in the environment variables.")

genai.configure(api_key=gemini_api_key)
# Use the specified gemini-2.5-flash model
model = genai.GenerativeModel('gemini-2.5-flash')

app = FastAPI(title="CramAI Backend")

# Allow CORS for local React Native development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    text: str

@app.post("/api/generate")
async def generate_flashcards(request: GenerateRequest):
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    
    prompt = f"""
    Extract the most important concepts from the following text and generate highly effective study flashcards. 
    CRITICAL INSTRUCTION: Ensure that every 'question' and 'answer' is a complete, grammatically correct sentence. Never leave a sentence incomplete or cut off, even if the source text is fragmented.
    Return a JSON array of objects with 'question' and 'answer' keys.
    
    Text:
    {request.text}
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        response_text = response.text.strip()
            
        # Validate that it's valid JSON
        try:
            flashcards = json.loads(response_text)
            # Basic schema validation
            if not isinstance(flashcards, list):
                raise ValueError("Response is not a list")
            for card in flashcards:
                if 'question' not in card or 'answer' not in card:
                    raise ValueError("Card is missing question or answer key")
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Failed to parse JSON from AI response: {response_text}")
            raise HTTPException(status_code=500, detail="AI generated invalid format.")
            
        return flashcards

    except Exception as e:
        print(f"Error calling Gemini: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-pdf")
async def generate_from_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        contents = await file.read()
        pdf_file = io.BytesIO(contents)
        extracted_text = ""
        
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
                    
        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract any text from the PDF.")
            
        # Re-use the prompt logic
        prompt = f"""
        Extract the most important concepts from the following text and generate highly effective study flashcards. 
        CRITICAL INSTRUCTION: Ensure that every 'question' and 'answer' is a complete, grammatically correct sentence. Never leave a sentence incomplete or cut off, even if the source text is fragmented.
        Return a JSON array of objects with 'question' and 'answer' keys.
        
        Text:
        {extracted_text}
        """
        
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        response_text = response.text.strip()
            
        flashcards = json.loads(response_text)
        if not isinstance(flashcards, list):
            raise ValueError("Response is not a list")
        for card in flashcards:
            if 'question' not in card or 'answer' not in card:
                raise ValueError("Card is missing question or answer key")
                
        return flashcards
        
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Failed to parse JSON from AI response: {response_text if 'response_text' in locals() else ''}")
        raise HTTPException(status_code=500, detail="AI generated invalid format.")
    except Exception as e:
        print(f"Error processing PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"message": "CramAI Backend is running!"}
