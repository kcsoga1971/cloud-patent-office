// ================================================================
// Patent Search Module (專利檢索模組)
// ================================================================

export interface PatentSearchResult {
  title: string
  url: string
  snippet: string
  patent_number?: string
  source: string
}

export async function searchPatents(
  query: string,
  apiKey: string,
  searchEngineId: string,
  maxResults: number = 5
): Promise<PatentSearchResult[]> {
  try {
    console.log(`🔍 開始搜尋專利: "${query}"`)
    
    const searchQuery = `${query} (site:patents.google.com OR site:twpat.tipo.gov.tw)`
    
    const url = new URL('https://www.googleapis.com/customsearch/v1')
    url.searchParams.append('key', apiKey)
    url.searchParams.append('cx', searchEngineId)
    url.searchParams.append('q', searchQuery)
    url.searchParams.append('num', maxResults.toString())
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google Search API Error (${response.status}): ${errorText}`)
    }
    
    const data = await response.json()
    const results: PatentSearchResult[] = []
    
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        const patentNumberMatch = item.title.match(/([A-Z]{2}\d{7,10}[A-Z]?\d?|TW[IUM]?\d{6,9})/i)
        
        let source = 'Unknown'
        if (item.link.includes('patents.google.com')) {
          source = 'Google Patents'
        } else if (item.link.includes('twpat.tipo.gov.tw')) {
          source = 'TIPO'
        }
        
        results.push({
          title: item.title,
          url: item.link,
          snippet: item.snippet || '',
          patent_number: patentNumberMatch ? patentNumberMatch[0] : undefined,
          source: source
        })
      }
    }
    
    console.log(`✅ 找到 ${results.length} 筆專利`)
    return results
    
  } catch (error) {
    console.error('❌ 專利檢索失敗:', error)
    return []
  }
}

export function formatPatentResults(results: PatentSearchResult[]): string {
  if (results.length === 0) {
    return '【專利檢索結果】\n無相關專利檢索結果。'
  }
  
  let formatted = '【專利檢索結果】\n\n'
  formatted += `共找到 ${results.length} 筆相關專利：\n\n`
  
  results.forEach((result, index) => {
    formatted += `--- 專利 ${index + 1} ---\n`
    formatted += `標題：${result.title}\n`
    if (result.patent_number) {
      formatted += `專利號：${result.patent_number}\n`
    }
    formatted += `來源：${result.source}\n`
    formatted += `摘要：${result.snippet}\n`
    formatted += `連結：${result.url}\n\n`
  })
  
  return formatted
}

export function buildSearchQuery(title: string, field: string, solution?: string): string {
  let query = `${title} ${field}`
  
  if (solution) {
    const keywords = solution
      .split(/[,、。；\s]+/)
      .filter(word => word.length > 2)
      .slice(0, 3)
      .join(' ')
    
    query += ` ${keywords}`
  }
  
  return query.trim()
}
