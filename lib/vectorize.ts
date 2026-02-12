import {
  AutoProcessor,
  RawImage,
  SiglipVisionModel,
  type Processor,
} from "@huggingface/transformers";

const MODEL_NAME = "Xenova/siglip-base-patch16-512";

let modelPromise: Promise<SiglipVisionModel> | null = null;
let processorPromise: Promise<Processor> | null = null;

async function getModel(): Promise<SiglipVisionModel> {
  if (!modelPromise) {
    console.log("[vectorize] Loading SigLIP model...");
    modelPromise = SiglipVisionModel.from_pretrained(MODEL_NAME, {
      dtype: "fp32",
    });
    await modelPromise;
    console.log(
      "[vectorize] SigLIP model loaded successfully (768 dimensions)",
    );
  }
  return modelPromise;
}

async function getProcessor(): Promise<Processor> {
  if (!processorPromise) {
    processorPromise = AutoProcessor.from_pretrained(MODEL_NAME);
  }
  return processorPromise;
}

async function vectorizeBuffer(buffer: Buffer): Promise<number[]> {
  const [model, processor] = await Promise.all([getModel(), getProcessor()]);

  // Load image from buffer using RawImage
  // Convert Buffer to Uint8Array to avoid Buffer.buffer type issues
  const uint8Array = new Uint8Array(buffer);
  const image = await RawImage.fromBlob(new Blob([uint8Array]));

  // Process image for SigLIP (handles resizing and normalization automatically)
  const image_inputs = await processor(image);

  // Generate embeddings using SigLIP vision model
  const { pooler_output } = await model(image_inputs);

  // Convert to regular array
  const embedding = Array.from(pooler_output.data) as number[];
  console.log(
    `[vectorize] Generated ${embedding.length}-dimensional SigLIP embedding`,
  );

  return embedding;
}

export async function vectorizeImageFromUrl(url: string): Promise<number[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${url}`);
  }
  const imageBuffer = Buffer.from(await response.arrayBuffer());
  return vectorizeBuffer(imageBuffer);
}

export async function vectorizeImageFromBuffer(
  buffer: Buffer,
): Promise<number[]> {
  return vectorizeBuffer(buffer);
}
