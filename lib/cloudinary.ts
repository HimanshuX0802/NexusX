export const CLOUDINARY_CONFIG = {
  cloudName: "dayjcmlcl",
  apiKey: "272468653137816",
  apiSecret: "1MuZgEf2C5IC7-TZ-lVoioqMdrk",
  uploadPreset: "nexusx_uploads", // We'll create this
}

export const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", "ml_default") // Using default preset
  formData.append("cloud_name", CLOUDINARY_CONFIG.cloudName)

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Upload failed")
    }

    const data = await response.json()
    return data.secure_url
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    throw new Error("Failed to upload image")
  }
}
