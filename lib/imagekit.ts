export const IMAGEKIT_CONFIG = {
  publicKey: "public_K6yvVOqIxnBQufJOMjLtVQV8Aiw=",
  urlEndpoint: "https://ik.imagekit.io/qd4rzb4n3",
  uploadEndpoint: "https://upload.imagekit.io/api/v1/files/upload",
}

export const uploadToImageKit = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("publicKey", IMAGEKIT_CONFIG.publicKey)
  formData.append("fileName", file.name)
  formData.append("folder", "/nexusx-chat") // Organize uploads in a folder

  try {
    const response = await fetch(IMAGEKIT_CONFIG.uploadEndpoint, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Upload failed")
    }

    const data = await response.json()
    return data.url // ImageKit returns the CDN URL
  } catch (error) {
    console.error("ImageKit upload error:", error)
    throw new Error("Failed to upload image")
  }
}
