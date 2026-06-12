import { unfurl as unfurlUrl } from 'unfurl.js'

export async function unfurlBookmark(url: string) {
  const parsedUrl = new URL(url)
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs can be unfurled.')
  }

  const result = await unfurlUrl(url)

  return {
    title: result.title ?? '',
    description: result.description ?? '',
    image: result.open_graph?.images?.[0]?.url ?? '',
    favicon: result.favicon ?? '',
  }
}
