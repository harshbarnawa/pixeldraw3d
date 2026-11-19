export function designLink(id) {
  return new URL("/d/" + encodeURIComponent(id), window.location.origin).href
}

export async function copyDesignLink(id) {
  const url = designLink(id)
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url)
      return { copied: true, url }
    } catch {
    }
  }

  const field = document.createElement("textarea")
  field.value = url
  field.setAttribute("readonly", "")
  field.style.position = "fixed"
  field.style.opacity = "0"
  field.style.left = "-9999px"
  document.body.appendChild(field)
  field.focus()
  field.select()

  let copied = false
  try {
    copied = document.execCommand("copy")
  } catch {
    copied = false
  }
  field.remove()
  return { copied, url }
}
