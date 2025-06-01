// Simple base64 image storage - no external service needed
export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

export const uploadImage = async (file: File): Promise<string> => {
  try {
    // Convert to base64 - this will be stored directly in Firebase
    const base64String = await convertToBase64(file)
    return base64String
  } catch (error) {
    console.error("Error converting image:", error)
    throw new Error("Failed to process image")
  }
}
