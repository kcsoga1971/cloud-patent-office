import { ref } from 'vue'
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  AlignmentType, 
  PageBreak, 
  convertInchesToTwip, 
  Footer, 
  PageNumber, 
  NumberFormat,
  ImageRun,
  HeadingLevel,
  TabStopType,
  TabStopPosition,
  UnderlineType // <--- ⚠️ 記得新增這個 Import
} from 'docx'
import { saveAs } from 'file-saver'
import { supabase } from '../supabase'

export function usePatentDocx() {
  const isGenerating = ref(false)
  const error = ref(null)

// ========================================
// 🛠️ 輔助函數：下載圖片並轉為 ArrayBuffer (含重試)
// ========================================
const fetchImageBuffer = async (url, maxRetries = 3, retryDelay = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!url) return null;
      
      console.log(`📥 下載圖片 (嘗試 ${attempt}/${maxRetries}):`, url.split('/').pop());
      
      const response = await fetch(url);
      
      // 400/404 可能是還沒同步完成
      if (response.status === 400 || response.status === 404) {
        if (attempt < maxRetries) {
          console.log(`⏳ 圖片尚未就緒，${retryDelay/1000} 秒後重試...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        console.warn(`⚠️ 圖片下載失敗 (${response.status}):`, url);
        return null;
      }
      
      if (!response.ok) {
        console.warn(`⚠️ 圖片下載失敗 (${response.status}):`, url);
        return null;
      }
      
      const buffer = await response.arrayBuffer();
      
      if (buffer.byteLength < 100) { 
        console.warn('⚠️ 下載的檔案過小，可能不是圖片:', url);
        return null;
      }

      console.log(`✅ 圖片下載成功:`, url.split('/').pop(), `(${(buffer.byteLength / 1024).toFixed(1)} KB)`);
      return buffer;
      
    } catch (e) {
      if (attempt < maxRetries) {
        console.log(`⏳ 下載失敗，${retryDelay/1000} 秒後重試...`, e.message);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      console.warn('⚠️ 無法下載圖片:', url, e);
      return null;
    }
  }
  return null;
}

// ========================================
// 🆕 從生成的 Document 計算頁數（只計算前三章節）
// ========================================
const calculatePageCountsFromDocument = (docSections, content) => {
  let abstractPages = 0
  let specificationPages = 0
  let claimsPages = 0
  
  docSections.forEach((section) => {
    const children = section.children || []
    
    // 計算段落數（排除空段落）
    const paragraphCount = children.filter(child => {
      if (child.constructor.name !== 'Paragraph') return false
      const hasContent = child.children?.some(c => c.text?.trim())
      return hasContent
    }).length
    
    // 估算頁數（每頁約 25 個段落）
    const estimatedPages = Math.ceil(paragraphCount / 25)
    
    // 判斷是哪個 Section（根據 footer 文字）
    const footerChildren = section.footers?.default?.children?.[0]?.children || []
    const footerText = footerChildren
      .map(child => child.text || '')
      .join('')
    
    if (footerText.includes('摘要')) {
      abstractPages = Math.max(estimatedPages, 1)
    } else if (footerText.includes('說明書')) {
      specificationPages = Math.max(estimatedPages, 5)
    } else if (footerText.includes('專利範圍') || footerText.includes('申請專利範圍')) {
      claimsPages = Math.max(estimatedPages, 1)
    }
    // ❌ 不計算圖式頁數
  })
  
  // 計算請求項數量
  const claimMatches = content.match(/【請求項\d+】/g) || []
  const claimCount = claimMatches.length
  
  console.log('📊 系統計算頁數:', {
    摘要: abstractPages,
    說明書: specificationPages,
    請求項: claimsPages,
    請求項數: claimCount
  })
  
  return {
    abstract_pages: abstractPages,
    specification_pages: specificationPages,
    claims_pages: claimsPages,
    claim_count: claimCount,
    // ✅ 這些欄位留空，等待使用者填入
    figures_pages: null,
    figure_count: null,
    total_pages: null
  }
}

// ========================================
// 主函數：生成並處理 DOCX
// ========================================
const generateAndHandleDocx = async ({ 
  jobId, 
  userId, 
  title, 
  content, 
  type = 'invention',
  mode = 'download_and_upload',
  figures = []
}) => {
  isGenerating.value = true
  error.value = null
  
  try {
    console.log('🚀 開始生成 Word 文件:', title)

    if (!content) throw new Error('內容為空，無法生成文件')

    // 1. 預先下載所有圖片（如果有的話）
    const imageBuffers = {}
    
    if (figures && figures.length > 0) {
      console.log('⏳ 正在下載圖片資源...')
      
      await Promise.all(figures.map(async (fig) => {
        if (fig.url) {
          const buffer = await fetchImageBuffer(fig.url)
          if (buffer) {
            imageBuffers[String(fig.fig_number)] = buffer
          }
        }
      }))
      
      console.log(`✅ 有效圖片資源: ${Object.keys(imageBuffers).length} 張`)
    }

    // 2. 建立 Docx 物件
    const doc = createDocxFromMarkdown(content, title, type, imageBuffers, figures)

    // 3. ✅ 從生成的 Document 計算頁數（只計算前三章節）
    const pageCounts = calculatePageCountsFromDocument(doc.sections, content)
    
    console.log('📄 頁數統計（系統計算）:', pageCounts)

    // 4. 轉為 Blob
    const blob = await Packer.toBlob(doc)
    
    // 5. 統一檔名
    const timestamp = Date.now()
    const typeLabel = type === 'invention' ? 'invention' : 'utility'
    const hasImages = Object.keys(imageBuffers).length > 0
    const suffix = hasImages ? '_with_figures' : ''
    const filename = `patent_${typeLabel}${suffix}_${timestamp}.docx`

    console.log('📄 產生檔案:', filename)

    // 6. 執行下載
    if (mode.includes('download')) {
      saveAs(blob, filename)
    }

    // 7. 執行上傳並更新頁數資訊
    let publicUrl = null
    if (mode.includes('upload') && userId && jobId) {
      publicUrl = await uploadToStorage(userId, jobId, filename, blob)
      
      // ✅ 更新頁數資訊到資料庫（只更新系統計算的部分）
      await updatePageCounts(jobId, pageCounts, publicUrl)
    }

    return { 
      success: true, 
      filename, 
      publicUrl,
      figuresIncluded: Object.keys(imageBuffers).length,
      pageCounts
    }

  } catch (err) {
    console.error('❌ Word 生成失敗:', err)
    error.value = err.message
    throw err
  } finally {
    isGenerating.value = false
  }
}

// ========================================
// 🆕 更新頁數資訊到資料庫（只更新系統計算的部分）
// ========================================
const updatePageCounts = async (jobId, pageCounts, docxUrl) => {
  try {
    const { error } = await supabase
      .from('saas_jobs')
      .update({
        abstract_pages: pageCounts.abstract_pages,
        specification_pages: pageCounts.specification_pages,
        claims_pages: pageCounts.claims_pages,
        claim_count: pageCounts.claim_count,
        exported_docx_url: docxUrl,
        exported_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
        // ❌ 不更新 figures_pages, figure_count, total_pages
      })
      .eq('id', jobId)
    
    if (error) throw error
    
    console.log('✅ 頁數資訊已更新到資料庫（系統計算部分）')
  } catch (err) {
    console.error('❌ 更新頁數失敗:', err)
    throw err
  }
}

// ========================================
// 上傳至 Supabase Storage (含錯誤處理)
// ========================================
const uploadToStorage = async (userId, jobId, filename, blob) => {
  const filePath = `${userId}/${jobId}/${filename}`
  const fileSizeMB = blob.size / (1024 * 1024)
  
  console.log(`📤 上傳檔案: ${filename} (${fileSizeMB.toFixed(2)} MB)`)
  
  // 大檔案警告 (但 Pro 方案應該沒問題)
  if (fileSizeMB > 50) {
    console.warn('⚠️ 檔案較大，上傳可能需要較長時間...')
  }
  
  try {
    const { error: uploadError } = await supabase.storage
      .from('patent-documents')
      .upload(filePath, blob, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      })

    if (uploadError) {
      console.error('❌ Storage 上傳錯誤:', uploadError)
      throw new Error('Storage 上傳失敗: ' + uploadError.message)
    }

    const { data } = supabase.storage
      .from('patent-documents')
      .getPublicUrl(filePath)

    console.log('✅ 上傳成功:', data.publicUrl)

    // 更新資料庫
    await supabase
      .from('saas_jobs')
      .update({ 
        output_file_url: data.publicUrl,
        status: 'exported',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
    
    return data.publicUrl
    
  } catch (err) {
    // 如果是網路問題，給出更友善的提示
    if (err.message.includes('Failed to fetch') || err.message.includes('ERR_CONNECTION')) {
      throw new Error('網路連線中斷，請檢查網路後重試。檔案已下載至本機。')
    }
    throw err
  }
}

  // ========================================
  // Markdown 轉 Docx (核心邏輯：文字 + 自動圖式章節)
  // ========================================
  const createDocxFromMarkdown = (text, title, type, imageBuffers, figuresList) => {
    const lines = text.split('\n')
    const docSections = []
    let currentSectionChildren = []
    
    // 初始頁尾
    let currentFooterSuffix = type === 'utility' ? '(新型摘要)' : '(發明摘要)'

    // 版面設定
    const pageMargins = {
      top: convertInchesToTwip(1),
      bottom: convertInchesToTwip(1),
      left: convertInchesToTwip(1.18),
      right: convertInchesToTwip(0.79)
    }

    const fontStyle = {
      ascii: "Times New Roman",
      hAnsi: "Times New Roman",
      eastAsia: "PMingLiU"
    }

    // 頁尾生成工廠
    const createFooter = (sectionName) => ({
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "第 ", size: 20, font: fontStyle }),
              new TextRun({ children: [PageNumber.CURRENT], size: 20, font: fontStyle }),
              new TextRun({ text: " 頁，共 ", size: 20, font: fontStyle }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES_IN_SECTION], size: 20, font: fontStyle }),
              new TextRun({ text: " 頁", size: 20, font: fontStyle }),
              new TextRun({ text: sectionName, size: 20, font: fontStyle })
            ]
          })
        ]
      })
    })

    // 1. 處理文字內容 (Loop)
    for (const line of lines) {
      const trimmed = line.trim()
      
      // 分節符號
      if (trimmed === '<<<SECTION_BREAK>>>') {
        if (currentSectionChildren.length > 0) {
          docSections.push({
            properties: {
              page: {
                margin: pageMargins,
                pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL }
              }
            },
            footers: createFooter(currentFooterSuffix),
            children: [...currentSectionChildren]
          })
          currentSectionChildren = []
        }
        continue
      }

      // 換頁
      if (trimmed === '\f') {
        currentSectionChildren.push(new Paragraph({ children: [new PageBreak()] }))
        continue
      }

      // 大標題處理 (更新頁尾)
      if (trimmed.match(/^【.+?】$/) && !trimmed.match(/^【\d+】/) && !trimmed.match(/^【圖\d+】/)) {
        // 判斷是否為主要大標題 (摘要、說明書、專利範圍、圖式)
        const isMainHeader = [
          '【發明摘要】', '【新型摘要】',
          '【發明說明書】', '【新型專利說明書】',
          '【發明申請專利範圍】', '【新型申請專利範圍】', '【申請專利範圍】',
          '【發明圖式】', '【新型圖式】', '【圖式】'
        ].includes(trimmed);

        if (isMainHeader) {
           const cleanTitle = trimmed.replace(/【|】/g, '')
           currentFooterSuffix = `(${cleanTitle})` // 更新頁尾
           
           currentSectionChildren.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 240 },
            children: [ new TextRun({ text: trimmed, bold: true, size: 44, font: fontStyle }) ]
          }))
        } else {
          // 次標題
          currentSectionChildren.push(new Paragraph({
            spacing: { before: 360, after: 120 },
            children: [ new TextRun({ text: trimmed, bold: true, size: 28, font: fontStyle }) ]
          }))
        }
        continue
      }

      // 忽略 Markdown 內文原本可能寫的「【圖1】」純標籤
      // 因為我們會在最後統一插入圖片，這裡跳過以免重複或格式錯誤
      if (trimmed.match(/^【圖\d+】$/)) {
        continue;
      }

      // 一般內文 (含段落編號、請求項等)
      // 這裡簡化處理，統一為內文格式，保留您的 Regex 邏輯也可
      currentSectionChildren.push(new Paragraph({
        spacing: { line: 360 },
        children: [ new TextRun({ text: trimmed, size: 28, font: fontStyle }) ]
      }))
    }

    // 將最後一段文字加入 Section
    if (currentSectionChildren.length > 0) {
      docSections.push({
        properties: {
          page: {
            margin: pageMargins,
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL }
          }
        },
        footers: createFooter(currentFooterSuffix),
        children: [...currentSectionChildren]
      })
    }

    // ============================================================
    // 🎨 關鍵修正：強制在文末新增「圖式」章節
    // ============================================================
    const validImagesKeys = Object.keys(imageBuffers).sort((a, b) => parseInt(a) - parseInt(b));
    
    if (validImagesKeys.length > 0) {
      const figureChildren = [];

      // 1. 加入大標題 【圖式】
      const drawTitle = type === 'utility' ? '【新型圖式】' : '【發明圖式】';
      figureChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240 },
        children: [ new TextRun({ text: drawTitle, bold: true, size: 44, font: fontStyle }) ]
      }));

      // 2. 迴圈插入每一張圖片
      validImagesKeys.forEach(figNum => {
        const buffer = imageBuffers[figNum];
        
        // 標題 【圖1】
        figureChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 120 },
          children: [ new TextRun({ text: `【圖${figNum}】`, size: 28, font: fontStyle }) ]
        }));

        // 圖片
        figureChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: buffer,
              transformation: {
                width: 400, // 寬度 400px
                height: 533 // 高度 (4:3 比例)
              }
            })
          ],
          spacing: { after: 360 }, // 圖與圖之間的距離
          pageBreakBefore: false // 是否每張圖換頁? 可自行決定
        }));
      });

      // 3. 建立獨立的圖式 Section
      docSections.push({
        properties: {
          page: {
            margin: pageMargins,
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL }
          }
        },
        // 頁尾顯示 (圖式)
        footers: createFooter(type === 'utility' ? '(新型圖式)' : '(發明圖式)'),
        children: figureChildren
      });
    }

    return new Document({ sections: docSections })
  }

  // ========================================
  // 🆕 新增：生成專利申請書-Phase 6
  // ========================================
  const generateApplicationForm = async ({
    profile,
    inventors,
    applicationInfo,
    mode = 'download' // 'download' | 'upload' | 'download_and_upload'
  }) => {
    isGenerating.value = true
    error.value = null

    try {
      console.log('🚀 開始生成專利申請書')

      // 1. 建立 Docx 文件
      const doc = createApplicationFormDocx(profile, inventors, applicationInfo)

      // 2. 轉為 Blob
      const blob = await Packer.toBlob(doc)

      // 3. 檔名
      const timestamp = Date.now()
      const filename = `專利申請書_${applicationInfo.invention_name_zh || 'draft'}_${timestamp}.docx`

      console.log('📄 產生檔案:', filename)

      // 4. 下載
      if (mode.includes('download')) {
        saveAs(blob, filename)
      }

      // 5. 上傳 (如果需要)
      let publicUrl = null
      if (mode.includes('upload') && profile.id) {
        publicUrl = await uploadApplicationForm(profile.id, filename, blob)
      }

      return {
        success: true,
        filename,
        publicUrl
      }

    } catch (err) {
      console.error('❌ 申請書生成失敗:', err)
      error.value = err.message
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  // ========================================
  // 🆕 建立申請書 Docx 文件-Phase 6
  // ========================================
  const createApplicationFormDocx = (profile, inventors, applicationInfo) => {
    const sections = []
    const fontStyle = {
      ascii: "Times New Roman",
      hAnsi: "Times New Roman",
      eastAsia: "PMingLiU"
    }

    const pageMargins = {
      top: convertInchesToTwip(1),
      bottom: convertInchesToTwip(1),
      left: convertInchesToTwip(1),
      right: convertInchesToTwip(1)
    }

    const children = []

    // ========== 標題 ==========
    children.push(
      new Paragraph({
        text: '發明專利申請書',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 240 }
      })
    )

    // ========== 說明文字 ==========
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '（本申請書格式、順序，請勿任意更動，※記號部分請勿填寫）',
            size: 18,
            font: fontStyle
          })
        ],
        spacing: { after: 240 }
      })
    )

    // ========== 一、發明名稱 ==========
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '一、發明名稱：（中文/英文）',
            bold: true,
            size: 24,
            font: fontStyle
          })
        ],
        spacing: { before: 240, after: 120 }
      })
    )

    // 中文名稱
    if (applicationInfo.invention_name_zh) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `中文：${applicationInfo.invention_name_zh}`,
              size: 22,
              font: fontStyle
            })
          ],
          spacing: { after: 60 }
        })
      )
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '中文：【請填寫發明名稱】',
              size: 22,
              font: fontStyle,
              color: 'FF0000' // 紅色
            })
          ],
          spacing: { after: 60 }
        })
      )
    }

    // 英文名稱
    if (applicationInfo.invention_name_en) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `英文：${applicationInfo.invention_name_en}`,
              size: 22,
              font: fontStyle
            })
          ],
          spacing: { after: 120 }
        })
      )
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '英文：【請填寫英文發明名稱】',
              size: 22,
              font: fontStyle,
              color: 'FF0000'
            })
          ],
          spacing: { after: 120 }
        })
      )
    }

    // ========== 二、申請人 ==========
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '二、申請人：',
            bold: true,
            size: 24,
            font: fontStyle
          })
        ],
        spacing: { before: 240, after: 120 }
      })
    )

    // 國籍
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `國籍：${profile.nationality || '中華民國'}`,
            size: 22,
            font: fontStyle
          })
        ],
        spacing: { after: 60 }
      })
    )

    // 身分種類
    const identityType = profile.is_company ? '法人' : '自然人'
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `身分種類：${identityType}`,
            size: 22,
            font: fontStyle
          })
        ],
        spacing: { after: 60 }
      })
    )

    // 身分證字號/統編
    if (profile.id_number) {
      const idLabel = profile.is_company ? '統一編號' : '身分證字號'
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${idLabel}：${profile.id_number}`,
              size: 22,
              font: fontStyle
            })
          ],
          spacing: { after: 60 }
        })
      )
    } else {
      const idLabel = profile.is_company ? '統一編號' : '身分證字號'
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${idLabel}：【請填寫】`,
              size: 22,
              font: fontStyle,
              color: 'FF0000'
            })
          ],
          spacing: { after: 60 }
        })
      )
    }

    // 姓名/名稱
    if (profile.is_company) {
      // 法人
      if (profile.company_name) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `名稱（中文）：${profile.company_name}`,
                size: 22,
                font: fontStyle
              })
            ],
            spacing: { after: 60 }
          })
        )
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '名稱（中文）：【請填寫公司名稱】',
                size: 22,
                font: fontStyle,
                color: 'FF0000'
              })
            ],
            spacing: { after: 60 }
          })
        )
      }

      if (profile.company_name_en) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `名稱（英文）：${profile.company_name_en}`,
                size: 22,
                font: fontStyle
              })
            ],
            spacing: { after: 60 }
          })
        )
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '名稱（英文）：【請填寫英文公司名稱】',
                size: 22,
                font: fontStyle,
                color: 'FF0000'
              })
            ],
            spacing: { after: 60 }
          })
        )
      }

      // 代表人
      if (profile.representative_name) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `代表人（中文）：${profile.representative_name}`,
                size: 22,
                font: fontStyle
              })
            ],
            spacing: { after: 60 }
          })
        )
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '代表人（中文）：【請填寫代表人姓名】',
                size: 22,
                font: fontStyle,
                color: 'FF0000'
              })
            ],
            spacing: { after: 60 }
          })
        )
      }

      if (profile.representative_name_en) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `代表人（英文）：${profile.representative_name_en}`,
                size: 22,
                font: fontStyle
              })
            ],
            spacing: { after: 60 }
          })
        )
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '代表人（英文）：【請填寫代表人英文姓名】',
                size: 22,
                font: fontStyle,
                color: 'FF0000'
              })
            ],
            spacing: { after: 60 }
          })
        )
      }

    } else {
      // 自然人
      if (profile.full_name) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `姓名（中文）：${profile.full_name}`,
                size: 22,
                font: fontStyle
              })
            ],
            spacing: { after: 60 }
          })
        )
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '姓名（中文）：【請填寫姓名】',
                size: 22,
                font: fontStyle,
                color: 'FF0000'
              })
            ],
            spacing: { after: 60 }
          })
        )
      }

      if (profile.full_name_en) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `姓名（英文）：${profile.full_name_en}`,
                size: 22,
                font: fontStyle
              })
            ],
            spacing: { after: 60 }
          })
        )
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '姓名（英文）：【請填寫英文姓名】',
                size: 22,
                font: fontStyle,
                color: 'FF0000'
              })
            ],
            spacing: { after: 60 }
          })
        )
      }
    }

    // 地址
    if (profile.address) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `地址（中文）：${profile.address}`,
              size: 22,
              font: fontStyle
            })
          ],
          spacing: { after: 60 }
        })
      )
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '地址（中文）：【請填寫地址】',
              size: 22,
              font: fontStyle,
              color: 'FF0000'
            })
          ],
          spacing: { after: 60 }
        })
      )
    }

    if (profile.address_en) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `地址（英文）：${profile.address_en}`,
              size: 22,
              font: fontStyle
            })
          ],
          spacing: { after: 60 }
        })
      )
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '地址（英文）：【請填寫英文地址】',
              size: 22,
              font: fontStyle,
              color: 'FF0000'
            })
          ],
          spacing: { after: 60 }
        })
      )
    }

    // 聯絡電話
    if (profile.phone) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `聯絡電話：${profile.phone}`,
              size: 22,
              font: fontStyle
            })
          ],
          spacing: { after: 120 }
        })
      )
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '聯絡電話：【請填寫】',
              size: 22,
              font: fontStyle,
              color: 'FF0000'
            })
          ],
          spacing: { after: 120 }
        })
      )
    }

    // ========== 三、發明人 ==========
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '三、發明人：',
            bold: true,
            size: 24,
            font: fontStyle
          })
        ],
        spacing: { before: 240, after: 120 }
      })
    )

    if (inventors && inventors.length > 0) {
      inventors.forEach((inventor, index) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `（第 ${index + 1} 發明人）`,
                size: 22,
                font: fontStyle
              })
            ],
            spacing: { before: 120, after: 60 }
          })
        )

        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `國籍：${inventor.nationality || '中華民國'}`,
                size: 22,
                font: fontStyle
              })
            ],
            spacing: { after: 60 }
          })
        )

        if (inventor.full_name) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `姓名（中文）：${inventor.full_name}`,
                  size: 22,
                  font: fontStyle
                })
              ],
              spacing: { after: 60 }
            })
          )
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '姓名（中文）：【請填寫】',
                  size: 22,
                  font: fontStyle,
                  color: 'FF0000'
                })
              ],
              spacing: { after: 60 }
            })
          )
        }

        if (inventor.full_name_en) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `姓名（英文）：${inventor.full_name_en}`,
                  size: 22,
                  font: fontStyle
                })
              ],
              spacing: { after: 120 }
            })
          )
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '姓名（英文）：【請填寫】',
                  size: 22,
                  font: fontStyle,
                  color: 'FF0000'
                })
              ],
              spacing: { after: 120 }
            })
          )
        }
      })
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '【請至個人資料設定新增發明人資料】',
              size: 22,
              font: fontStyle,
              color: 'FF0000'
            })
          ],
          spacing: { after: 120 }
        })
      )
    }

    // ========== 四、聲明事項 ==========
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '四、聲明事項：',
            bold: true,
            size: 24,
            font: fontStyle
          })
        ],
        spacing: { before: 240, after: 120 }
      })
    )

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '☐ 本案符合優惠期相關規定',
            size: 22,
            font: fontStyle
          })
        ],
        spacing: { after: 60 }
      })
    )

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '☐ 主張優先權',
            size: 22,
            font: fontStyle
          })
        ],
        spacing: { after: 60 }
      })
    )

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '☐ 主張利用生物材料',
            size: 22,
            font: fontStyle
          })
        ],
        spacing: { after: 120 }
      })
    )

    // ========== 五、說明書頁數、請求項數及申請規費 ==========
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '五、說明書頁數、請求項數及申請規費：',
            bold: true,
            size: 24,
            font: fontStyle
          })
        ],
        spacing: { before: 240, after: 120 }
      })
    )

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `摘要：(${applicationInfo.abstract_pages})頁，` +
                  `說明書：(${applicationInfo.specification_pages})頁，` +
                  `申請專利範圍：(${applicationInfo.claims_pages})頁，` +
                  `圖式：(${applicationInfo.figures_pages})頁，` +
                  `合計共(${applicationInfo.total_pages})頁。`,
            size: 22,
            font: fontStyle
          })
        ],
        spacing: { after: 60 }
      })
    )

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `申請專利範圍之請求項共(${applicationInfo.claim_count})項，` +
                  `圖式共(${applicationInfo.figure_count})圖。`,
            size: 22,
            font: fontStyle
          })
        ],
        spacing: { after: 60 }
      })
    )

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `規費：共計新臺幣 ${applicationInfo.application_fee.toLocaleString()} 元整。`,
            size: 22,
            font: fontStyle
          })
        ],
        spacing: { after: 120 }
      })
    )

    // ========== 六、附送書件 ==========
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '六、附送書件：',
            bold: true,
            size: 24,
            font: fontStyle
          })
        ],
        spacing: { before: 240, after: 120 }
      })
    )

    const attachments = [
      '☑ 1、摘要 1 份。',
      '☑ 2、說明書 1 份。',
      '☑ 3、申請專利範圍 1 份。',
      '☑ 4、必要圖式 1 份。'
    ]

    attachments.forEach(item => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: item,
              size: 22,
              font: fontStyle
            })
          ],
          spacing: { after: 60 }
        })
      )
    })

    // ========== 建立文件 ==========
    sections.push({
      properties: {
        page: {
          margin: pageMargins
        }
      },
      children: children
    })

    return new Document({ sections })
  }

  // ========================================
  // 🆕 上傳申請書至 Storage
  // ========================================
  const uploadApplicationForm = async (userId, filename, blob) => {
    const filePath = `${userId}/application_forms/${filename}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('patent-documents')
        .upload(filePath, blob, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true
        })

      if (uploadError) {
        throw new Error('Storage 上傳失敗: ' + uploadError.message)
      }

      const { data } = supabase.storage
        .from('patent-documents')
        .getPublicUrl(filePath)

      console.log('✅ 申請書上傳成功:', data.publicUrl)
      return data.publicUrl

    } catch (err) {
      console.error('❌ 上傳失敗:', err)
      throw err
    }
  }

// ========================================
  // 🆕 新增：生成答辯相關文件 (申復書 & 修正稿)
  // ========================================
  const generateDefenseDocs = async ({
    fileName,
    title,       // 文件標題，如 "專利申復理由書" 或 "修正後申請專利範圍"
    content,     // AI 生成的 Markdown 內容
    metaInfo = {} // 案號、申請日等資訊 (可選)
  }) => {
    isGenerating.value = true
    error.value = null

    try {
      console.log(`🚀 開始生成答辯文件: ${title}`)

      const doc = createDefenseDocx(title, content, metaInfo)
      const blob = await Packer.toBlob(doc)
      
      // 檔名加上時間戳記防止重複
      const finalFileName = `${fileName}_${Date.now()}.docx`
      saveAs(blob, finalFileName)

      return { success: true, filename: finalFileName }

    } catch (err) {
      console.error('❌ 文件生成失敗:', err)
      error.value = err.message
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  // ========================================
  // 🆕 核心邏輯：建立答辯文件結構
  // ========================================
  const createDefenseDocx = (title, markdownContent, metaInfo) => {
    const fontStyle = {
      ascii: "Times New Roman",
      hAnsi: "Times New Roman",
      eastAsia: "PMingLiU" // 新細明體
    }

    const pageMargins = {
      top: convertInchesToTwip(1),
      bottom: convertInchesToTwip(1),
      left: convertInchesToTwip(1),
      right: convertInchesToTwip(1)
    }

    const children = []

    // 1. 文件大標題
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 480 },
        border: { bottom: { style: "single", size: 6, space: 1 } } // 下方加一條線看起來更正式
      })
    )

    // 2. 案件基本資料 (如果有傳入)
    if (Object.keys(metaInfo).length > 0) {
      for (const [key, value] of Object.entries(metaInfo)) {
        if (value) {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `${key}：`, bold: true, font: fontStyle }),
              new TextRun({ text: String(value), font: fontStyle })
            ],
            spacing: { after: 120 }
          }))
        }
      }
      // 加個分隔線
      children.push(new Paragraph({
        text: "",
        border: { bottom: { style: "dashed", size: 6, space: 1 } },
        spacing: { after: 240 }
      }))
    }

    // 3. 解析 Markdown 內容 (這是重點！)
    const lines = markdownContent.split('\n')
    
    for (let line of lines) {
      line = line.trim()
      if (!line) continue // 跳過空行

      // 處理標題 (##, ###)
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)[0].length
        const text = line.replace(/^#+\s*/, '')
        
        // 對應 docx 的標題層級
        const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : 
                             level === 2 ? HeadingLevel.HEADING_2 : 
                             HeadingLevel.HEADING_3

        children.push(new Paragraph({
          text: text,
          heading: headingLevel,
          spacing: { before: 240, after: 120 }
        }))
        continue
      }

      // 處理分隔線 (---)
      if (line === '---' || line === '***') {
        children.push(new Paragraph({
          text: "",
          border: { bottom: { style: "single", size: 6, space: 1 } },
          spacing: { before: 120, after: 120 }
        }))
        continue
      }

      // 處理內文 (包含粗體轉底線、刪除線)
      const textRuns = parseMarkdownLine(line, fontStyle)
      
      children.push(new Paragraph({
        children: textRuns,
        spacing: { line: 360 }, // 1.5 倍行高
        alignment: AlignmentType.JUSTIFIED
      }))
    }

    // 4. 頁碼
    const footer = new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ children: [PageNumber.CURRENT], font: fontStyle }),
          ]
        })
      ]
    })

    return new Document({
      sections: [{
        properties: {
          page: { margin: pageMargins }
        },
        footers: { default: footer },
        children: children
      }]
    })
  }

  // ========================================
  // 🆕 輔助函數：解析單行 Markdown (畫線稿核心)
  // ========================================
  const parseMarkdownLine = (text, fontStyle) => {
    // 這個 Regex 會把字串切成：普通文字, **粗體**, ~~刪除線~~
    // 注意：這裡假設粗體就是新增(紅字底線)，刪除線就是刪除(灰字刪除線)
    const regex = /(\*\*.*?\*\*|~~.*?~~)/g
    const parts = text.split(regex)
    const runs = []

    parts.forEach(part => {
      if (!part) return

      if (part.startsWith('**') && part.endsWith('**')) {
        // === 新增文字 (粗體語法) ===
        // 轉為：藍色(或紅色)、粗體、底線
        runs.push(new TextRun({
          text: part.slice(2, -2),
          bold: true,
          color: "0000FF", // 藍色 (專利實務常用藍色或紅色標示新增)
          underline: {
            type: UnderlineType.SINGLE,
            color: "0000FF"
          },
          font: fontStyle
        }))
      } else if (part.startsWith('~~') && part.endsWith('~~')) {
        // === 刪除文字 (刪除線語法) ===
        // 轉為：灰色、刪除線
        runs.push(new TextRun({
          text: part.slice(2, -2),
          strike: true,
          color: "888888",
          font: fontStyle
        }))
      } else {
        // === 普通文字 ===
        runs.push(new TextRun({
          text: part,
          font: fontStyle
        }))
      }
    })

    return runs
  }

  // ========================================
  // 🆕 新增：生成迴避設計分析報告
  // ========================================
  const generateDesignAroundReport = async ({
    fileName,
    targetNumber,
    myIdea,
    resultData
  }) => {
    isGenerating.value = true
    error.value = null

    try {
      console.log(`🚀 開始生成迴避設計報告: ${fileName}`)

      // 1. 將 JSON 資料轉換為 Markdown 格式的報告內容
      let content = `# 專利迴避設計分析報告\n\n`
      
      // 基本資訊
      content += `## 壹、案件基本資料\n`
      content += `**目標專利案號**：${targetNumber}\n`
      content += `**分析日期**：${new Date().toLocaleDateString('zh-TW')}\n\n`
      
      content += `## 貳、己方技術構想\n`
      content += `${myIdea}\n\n`

      // 侵權風險
      if (resultData.infringement_risk_assessment) {
        const risk = resultData.infringement_risk_assessment
        content += `## 參、侵權風險評估\n`
        content += `**風險等級**：${risk.risk_level || '未評估'}\n`
        content += `**評估理由**：\n${risk.reason || '無'}\n\n`
      }

      // 目標專利拆解
      if (resultData.target_claim_analysis) {
        content += `## 肆、目標專利權利範圍解構 (獨立項)\n`
        content += `> ${resultData.target_claim_analysis.claim_text || '無法取得請求項原文'}\n\n`
        content += `**構成要件拆解**：\n`
        const elements = resultData.target_claim_analysis.elements || []
        elements.forEach((el, idx) => {
          content += `${idx + 1}. ${el}\n`
        })
        content += `\n`
      }

      // 迴避策略
      if (resultData.strategies && resultData.strategies.length > 0) {
        content += `## 伍、AI 建議迴避策略\n`
        resultData.strategies.forEach((strategy, idx) => {
          content += `### 策略 ${idx + 1}：${strategy.title}\n`
          content += `**類型**：${strategy.type}\n`
          content += `**迴避成功率**：${strategy.success_rate}\n`
          content += `**技術方案描述**：\n${strategy.description}\n`
          content += `**優點 (Pros)**：${strategy.pros}\n`
          content += `**缺點/風險 (Cons)**：${strategy.cons}\n`
          content += `\n---\n` // 分隔線
        })
      }

      // 2. 呼叫現有的通用 DOCX 生成函式
      // 我們復用 generateDefenseDocs，因為它的格式 (標題+Markdown) 很適合這種報告
      const doc = createDefenseDocx(
        '專利迴避設計分析報告', // 文件大標題
        content,                // 剛剛組裝好的 Markdown
        {                       // Meta Info
          '目標案號': targetNumber,
          '報告類型': 'Design Around Analysis'
        }
      )

      // 3. 轉 Blob 並下載
      const blob = await Packer.toBlob(doc)
      const finalFileName = `${fileName}_${Date.now()}.docx`
      saveAs(blob, finalFileName)

      return { success: true, filename: finalFileName }

    } catch (err) {
      console.error('❌ 報告生成失敗:', err)
      error.value = err.message
      throw err
    } finally {
      isGenerating.value = false
    }
  }

// ========================================
  // 🆕 新增：生成侵權分析報告 (含均等論/警語)
  // ========================================
  const generateInfringementReport = async ({
    fileName,
    targetNumber,
    productName,
    resultData
  }) => {
    isGenerating.value = true
    error.value = null

    try {
      console.log(`🚀 生成侵權報告: ${fileName}`)

      let markdownContent = `# 專利侵權分析報告\n\n`
      
      // 警語 (紅字)
      markdownContent += `> ⚠️ **重要聲明**：本報告係由人工智慧系統自動生成，僅供技術分析參考，不具法律效力。如需運用於訴訟或法律攻防，請務必諮詢專業律師。\n\n`

      markdownContent += `## 壹、分析對象\n`
      markdownContent += `**目標專利**：${targetNumber}\n`
      markdownContent += `**待鑑定產品**：${productName}\n`
      markdownContent += `**分析日期**：${new Date().toLocaleDateString('zh-TW')}\n\n`
      
      // 結論
      if (resultData.overall_conclusion) {
        markdownContent += `## 貳、鑑定結論\n`
        markdownContent += `**鑑定結果**：${resultData.overall_conclusion.result}\n`
        markdownContent += `**風險指數**：${resultData.overall_conclusion.risk_score}/100\n`
        markdownContent += `**綜合分析**：\n${resultData.overall_conclusion.summary}\n\n`
      }

      // Claim Chart
      markdownContent += `## 參、全要件比對分析表 (Claim Chart)\n`
      markdownContent += `獨立項內容：${resultData.target_claim_text || '略'}\n\n`
      
      const chart = resultData.claim_chart || []
      
      chart.forEach((row, idx) => {
        markdownContent += `### 要件 ${idx + 1} (${row.element_id || idx+1})\n`
        markdownContent += `**【專利構成要件】**：\n${row.element_text}\n\n`
        markdownContent += `**【產品對應特徵】**：\n${row.product_feature}\n\n`
        markdownContent += `**【文義讀取】**：${row.literal_match}\n`
        
        if (row.literal_match === 'No') {
          const doe = row.doe_analysis || {}
          markdownContent += `**【均等論分析】**：\n`
          markdownContent += `- 功能 (Function): ${doe.function_match}\n`
          markdownContent += `- 方法 (Way): ${doe.way_match}\n`
          markdownContent += `- 結果 (Result): ${doe.result_match}\n`
          markdownContent += `- 結論: ${doe.conclusion}\n`
        }
        
        if (row.estoppel_risk && row.estoppel_risk !== 'Low') {
          markdownContent += `**⚠️ 禁反言風險**：${row.estoppel_risk}\n`
        }
        
        markdownContent += `---\n`
      })

      const doc = createDefenseDocx(
        '專利侵權分析報告',
        markdownContent,
        { '案號': targetNumber, '產品': productName }
      )

      const blob = await Packer.toBlob(doc)
      const finalFileName = `${fileName}_${Date.now()}.docx`
      saveAs(blob, finalFileName)

      return { success: true, filename: finalFileName }

    } catch (err) {
      console.error(err)
      error.value = err.message
    } finally {
      isGenerating.value = false
    }
  }

  // ========================================
  // 🆕 新增：生成專利分析報告 (支援多種類型)
  // ========================================
  const generateAnalysisReport = async ({
    fileName,
    type,
    resultData
  }) => {
    isGenerating.value = true
    error.value = null

    try {
      console.log(`🚀 生成分析報告 (${type}): ${fileName}`)

      let markdownContent = `# 專利情報分析報告\n\n`
      markdownContent += `**報告類型**：${type}\n`
      markdownContent += `**生成日期**：${new Date().toLocaleDateString('zh-TW')}\n\n`

      // 根據類型插入不同內容
      if (type === 'tech_map') {
        markdownContent += `## 技術圖譜分析\n`
        markdownContent += `本報告包含 AI 自動生成的技術流程圖代碼與分析。\n\n`
        markdownContent += `### 技術特徵摘要\n`
        markdownContent += `${resultData.analysis?.summary || '無'}\n\n`
        
        if (resultData.mermaid_code) {
          markdownContent += `### Mermaid 流程圖代碼\n`
          markdownContent += `\`\`\`mermaid\n${resultData.mermaid_code}\n\`\`\`\n\n`
          markdownContent += `> 提示：請使用支援 Mermaid 的 Markdown 編輯器或瀏覽器外掛查看圖表。\n`
        }
        
        if (resultData.html_report_url) {
           markdownContent += `\n**[點此查看完整互動式 HTML 報告](${resultData.html_report_url})**\n`
        }

      } else {
        // 單篇分析或地圖分析
        markdownContent += `## 分析摘要\n`
        markdownContent += `${resultData.analysis?.summary || '內容生成中...'}\n\n`
        
        // 這裡可以根據您 n8n 回傳的結構 (claims_structure, technical_features) 
        // 進一步展開詳細欄位。目前先做通用版。
        if (resultData.analysis?.analysis_report_markdown) {
           markdownContent += `\n---\n${resultData.analysis.analysis_report_markdown}\n`
        }
      }

      const doc = createDefenseDocx(
        '專利分析報告',
        markdownContent,
        { '類型': type }
      )

      const blob = await Packer.toBlob(doc)
      const finalFileName = `${fileName}_${Date.now()}.docx`
      saveAs(blob, finalFileName)

      return { success: true, filename: finalFileName }

    } catch (err) {
      console.error(err)
      error.value = err.message
    } finally {
      isGenerating.value = false
    }
  }

// ========================================
// 🆕 新增：生成專利鑑價報告 - Enhancement 2
// ========================================
const generateValuationReport = async (patentNumber, resultData) => {
  if (!resultData) {
    throw new Error('缺少鑑價結果資料')
  }

  isGenerating.value = true
  error.value = null

  try {
    console.log('🏗️ 開始生成鑑價報告...', patentNumber)
    
    const doc = createValuationReportDocx(patentNumber, resultData)
    const buffer = await Packer.toBuffer(doc)
    
    const filename = `專利鑑價預分析報告_${patentNumber}_${new Date().toISOString().split('T')[0]}.docx`
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), filename)
    
    console.log('✅ 鑑價報告生成完成:', filename)
    return { success: true, filename }
    
  } catch (err) {
    console.error('❌ 鑑價報告生成失敗:', err)
    error.value = err.message
    throw err
  } finally {
    isGenerating.value = false
  }
}

  return {
    isGenerating,
    error,
    generateAndHandleDocx,
    generateApplicationForm, // 🆕 新增
    generateDefenseDocs, // 🆕 新增
    generateDesignAroundReport,
    generateInfringementReport, // <--- ✅ 新增這行
    generateAnalysisReport,
    generateValuationReport // 🆕 新增鑑價報告
  }
}

// ========================================
// 🆕 新增：生成專利舉發理由書（完整版）-20260201
// ========================================
const generateInvalidationBrief = async ({
  fileName,
  targetPatentNumber,
  targetPatentName,
  petitioner, // 舉發人資訊
  evidencePatents, // 證據專利列表
  resultData // n8n 回傳的分析結果
}) => {
  isGenerating.value = true
  error.value = null

  try {
    console.log(`🚀 開始生成舉發理由書: ${fileName}`)

    // 1. 建立 Docx（使用專門的函數）
    const doc = createInvalidationBriefDocx({
      targetPatentNumber,
      targetPatentName,
      petitioner,
      evidencePatents,
      resultData
    })

    // 2. 轉 Blob 並下載
    const blob = await Packer.toBlob(doc)
    const finalFileName = `${fileName}_${Date.now()}.docx`
    saveAs(blob, finalFileName)

    return { success: true, filename: finalFileName }

  } catch (err) {
    console.error('❌ 舉發理由書生成失敗:', err)
    error.value = err.message
    throw err
  } finally {
    isGenerating.value = false
  }
}

// ========================================
// 🆕 核心函數：建立舉發理由書 Docx（使用 Table）
// ========================================
const createInvalidationBriefDocx = ({
  targetPatentNumber,
  targetPatentName,
  petitioner,
  evidencePatents,
  resultData
}) => {
  const fontStyle = {
    ascii: "Times New Roman",
    hAnsi: "Times New Roman",
    eastAsia: "PMingLiU"
  }

  const pageMargins = {
    top: convertInchesToTwip(1),
    bottom: convertInchesToTwip(1),
    left: convertInchesToTwip(1),
    right: convertInchesToTwip(1)
  }

  const children = []

  // ========== 標題 ==========
  children.push(
    new Paragraph({
      text: '專利舉發理由書',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 480 }
    })
  )

  // ========== 基本資訊 ==========
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '系爭專利號：', bold: true, size: 24, font: fontStyle }),
        new TextRun({ text: targetPatentNumber, size: 24, font: fontStyle })
      ],
      spacing: { after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '發明名稱：', bold: true, size: 24, font: fontStyle }),
        new TextRun({ text: targetPatentName, size: 24, font: fontStyle })
      ],
      spacing: { after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '舉發人：', bold: true, size: 24, font: fontStyle }),
        new TextRun({ text: petitioner.name, size: 24, font: fontStyle })
      ],
      spacing: { after: 120 }
    })
  )

  if (petitioner.agent) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '代理人：', bold: true, size: 24, font: fontStyle }),
          new TextRun({ text: petitioner.agent, size: 24, font: fontStyle })
        ],
        spacing: { after: 120 }
      })
    )
  }

  // 分隔線
  children.push(
    new Paragraph({
      text: '',
      border: { bottom: { style: 'single', size: 6, space: 1 } },
      spacing: { before: 120, after: 240 }
    })
  )

  // ========== 壹、舉發主旨 ==========
  children.push(
    new Paragraph({
      text: '壹、舉發主旨',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 240 }
    })
  )

  const applicationDate = resultData.target_analysis?.application_date || '【請填寫】'
  const publicationDate = resultData.target_analysis?.publication_date || '【請填寫】'

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `舉發人茲依據專利法第 71 條第 1 項第 1 款之規定，以系爭專利「${targetPatentName}」（專利號：${targetPatentNumber}，申請日：${applicationDate}，公告日：${publicationDate}）不符合專利法第 22 條第 2 項之規定（進步性），提出舉發，請求撤銷系爭專利。`,
          size: 24,
          font: fontStyle
        })
      ],
      spacing: { line: 360, after: 240 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '舉發證據：', bold: true, size: 24, font: fontStyle })
      ],
      spacing: { before: 120, after: 120 }
    })
  )

  evidencePatents.forEach((evidence, idx) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `證據 ${idx + 1}：${evidence.patent_number}（${evidence.title}，公開日：${evidence.publication_date}）`,
            size: 24,
            font: fontStyle
          })
        ],
        spacing: { after: 60 }
      })
    )
  })

  // ========== 貳、系爭專利技術內容 ==========
  children.push(
    new Paragraph({
      text: '貳、系爭專利技術內容',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 240 }
    })
  )

  children.push(
    new Paragraph({
      text: '2.1 專利基本資訊',
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 240, after: 120 }
    })
  )

  const basicInfo = [
    ['專利號', targetPatentNumber],
    ['發明名稱', targetPatentName],
    ['申請日', applicationDate],
    ['公告日', publicationDate]
  ]

  basicInfo.forEach(([label, value]) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${label}：`, bold: true, size: 24, font: fontStyle }),
          new TextRun({ text: value, size: 24, font: fontStyle })
        ],
        spacing: { after: 60 }
      })
    )
  })

  children.push(
    new Paragraph({
      text: '2.2 請求項 1 的技術特徵',
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 240, after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '請求項 1 原文：', bold: true, size: 24, font: fontStyle })
      ],
      spacing: { after: 120 }
    })
  )

  const claim1Text = resultData.target_analysis?.claim_1_text || '【請填寫請求項 1 原文】'
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: claim1Text, size: 24, font: fontStyle, italics: true })
      ],
      spacing: { line: 360, after: 240 },
      indent: { left: convertInchesToTwip(0.5) }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '技術特徵拆解：', bold: true, size: 24, font: fontStyle })
      ],
      spacing: { before: 120, after: 120 }
    })
  )

  const features = resultData.target_analysis?.technical_features || []
  features.forEach((feature, idx) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ 
            text: `特徵 ${String.fromCharCode(65 + idx)}：`, 
            bold: true, 
            size: 24, 
            font: fontStyle 
          }),
          new TextRun({ text: feature, size: 24, font: fontStyle })
        ],
        spacing: { after: 60 }
      })
    )
  })

  // ========== 參、證據專利技術內容 ==========
  children.push(
    new Paragraph({
      text: '參、證據專利技術內容',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 240 }
    })
  )

  evidencePatents.forEach((evidence, idx) => {
    const evidenceAnalysis = resultData.evidence_analyses?.[idx] || {}

    children.push(
      new Paragraph({
        text: `3.${idx + 1} 證據 ${idx + 1}`,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 }
      })
    )

    const evidenceInfo = [
      ['專利號', evidence.patent_number],
      ['發明名稱', evidence.title],
      ['申請日', evidence.application_date],
      ['公開日/公告日', evidence.publication_date]
    ]

    evidenceInfo.forEach(([label, value]) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${label}：`, bold: true, size: 24, font: fontStyle }),
            new TextRun({ text: value, size: 24, font: fontStyle })
          ],
          spacing: { after: 60 }
        })
      )
    })

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '技術內容摘要：', bold: true, size: 24, font: fontStyle })
        ],
        spacing: { before: 120, after: 60 }
      })
    )

    children.push(
      new Paragraph({
        children: [
          new TextRun({ 
            text: evidenceAnalysis.summary || '【請填寫證據專利技術摘要】', 
            size: 24, 
            font: fontStyle 
          })
        ],
        spacing: { line: 360, after: 120 }
      })
    )

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '主要技術特徵：', bold: true, size: 24, font: fontStyle })
        ],
        spacing: { before: 120, after: 60 }
      })
    )

    const evidenceFeatures = evidenceAnalysis.technical_features || []
    evidenceFeatures.forEach((feature, fIdx) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${fIdx + 1}. ${feature}`, size: 24, font: fontStyle })
          ],
          spacing: { after: 60 }
        })
      )
    })
  })

  // ========== 肆、技術特徵比對 ==========
  children.push(
    new Paragraph({
      text: '肆、技術特徵比對',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 240 }
    })
  )

  children.push(
    new Paragraph({
      text: '4.1 比對表',
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 240, after: 120 }
    })
  )

  // ✅ 使用 docx 的 Table 功能
  const { Table, TableRow, TableCell, WidthType, VerticalAlign, Shading } = require('docx')

  const comparisons = resultData.feature_comparisons || []
  
  const tableRows = [
    // 表頭
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          children: [new Paragraph({ 
            text: '系爭專利技術特徵', 
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '系爭專利技術特徵', bold: true, size: 24, font: fontStyle })]
          })],
          shading: { fill: 'D9D9D9' },
          verticalAlign: VerticalAlign.CENTER
        }),
        new TableCell({
          children: [new Paragraph({ 
            text: '證據 1', 
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '證據 1', bold: true, size: 24, font: fontStyle })]
          })],
          shading: { fill: 'D9D9D9' },
          verticalAlign: VerticalAlign.CENTER
        }),
        new TableCell({
          children: [new Paragraph({ 
            text: '證據 2', 
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '證據 2', bold: true, size: 24, font: fontStyle })]
          })],
          shading: { fill: 'D9D9D9' },
          verticalAlign: VerticalAlign.CENTER
        }),
        new TableCell({
          children: [new Paragraph({ 
            text: '比對結果', 
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '比對結果', bold: true, size: 24, font: fontStyle })]
          })],
          shading: { fill: 'D9D9D9' },
          verticalAlign: VerticalAlign.CENTER
        })
      ]
    })
  ]

  // 表格內容
  comparisons.forEach((comp) => {
    const evidence1Text = comp.evidence_1_match 
      ? `✅ 已揭露（${comp.evidence_1_location}）` 
      : '❌ 未揭露'
    
    const evidence2Text = comp.evidence_2_match 
      ? `✅ 已揭露（${comp.evidence_2_location}）` 
      : '❌ 未揭露'
    
    const resultText = comp.evidence_1_match || comp.evidence_2_match ? '已揭露' : '未揭露'

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              children: [
                new TextRun({ text: `${comp.feature_id}: `, bold: true, size: 22, font: fontStyle }),
                new TextRun({ text: comp.feature_text, size: 22, font: fontStyle })
              ]
            })],
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ 
              text: evidence1Text,
              children: [new TextRun({ text: evidence1Text, size: 22, font: fontStyle })]
            })],
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ 
              text: evidence2Text,
              children: [new TextRun({ text: evidence2Text, size: 22, font: fontStyle })]
            })],
            verticalAlign: VerticalAlign.CENTER
          }),
          new TableCell({
            children: [new Paragraph({ 
              text: resultText,
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: resultText, bold: true, size: 22, font: fontStyle })]
            })],
            verticalAlign: VerticalAlign.CENTER
          })
        ]
      })
    )
  })

  const comparisonTable = new Table({
    rows: tableRows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    }
  })

  children.push(comparisonTable)

  // ========== 伍、進步性分析 ==========
  children.push(
    new Paragraph({
      text: '伍、進步性分析',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 240 }
    })
  )

  const inventiveStepSections = [
    ['5.1 技術領域關聯性', resultData.inventive_step_result?.field_relevance],
    ['5.2 技術組合的合理性', resultData.combination_analysis_text],
    ['5.3 技術差異的顯而易見性', resultData.inventive_step_result?.obviousness_analysis],
    ['5.4 技術效果的可預期性', resultData.inventive_step_result?.effect_predictability]
  ]

  inventiveStepSections.forEach(([title, content]) => {
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 }
      })
    )

    children.push(
      new Paragraph({
        children: [
          new TextRun({ 
            text: content || '【請填寫分析內容】', 
            size: 24, 
            font: fontStyle 
          })
        ],
        spacing: { line: 360, after: 240 }
      })
    )
  })

  children.push(
    new Paragraph({
      text: '5.5 結論',
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 240, after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `綜合以上分析，系爭專利之技術特徵可由證據專利組合完成，且該組合對所屬技術領域中具有通常知識者而言是顯而易見的，系爭專利不具進步性，不符合專利法第 22 條第 2 項之規定。`,
          size: 24,
          font: fontStyle
        })
      ],
      spacing: { line: 360, after: 240 }
    })
  )

  // ========== 陸、結論與請求 ==========
  children.push(
    new Paragraph({
      text: '陸、結論與請求',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 240 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `綜上所述，系爭專利「${targetPatentName}」（專利號：${targetPatentNumber}）之技術特徵可由證據專利組合完成，且該組合對所屬技術領域中具有通常知識者而言是顯而易見的，系爭專利不具進步性，不符合專利法第 22 條第 2 項之規定。`,
          size: 24,
          font: fontStyle
        })
      ],
      spacing: { line: 360, after: 240 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '懇請 鈞局詳予審酌，作成舉發成立之審定，撤銷系爭專利。',
          size: 24,
          font: fontStyle
        })
      ],
      spacing: { line: 360, after: 360 }
    })
  )

  children.push(
    new Paragraph({
      text: '此致',
      spacing: { before: 240, after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '經濟部智慧財產局', bold: true, size: 24, font: fontStyle })
      ],
      spacing: { after: 240 }
    })
  )

  const currentDate = new Date()
  const rocYear = currentDate.getFullYear() - 1911
  const month = currentDate.getMonth() + 1
  const day = currentDate.getDate()

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `舉發人：${petitioner.name}`, size: 24, font: fontStyle })
      ],
      spacing: { after: 60 }
    })
  )

  if (petitioner.agent) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `代理人：${petitioner.agent}`, size: 24, font: fontStyle })
        ],
        spacing: { after: 60 }
      })
    )
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ 
          text: `中華民國 ${rocYear} 年 ${month} 月 ${day} 日`, 
          size: 24, 
          font: fontStyle 
        })
      ],
      spacing: { before: 120, after: 360 }
    })
  )

  // ========== 柒、證據清單 ==========
  children.push(
    new Paragraph({
      text: '柒、證據清單',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 240 }
    })
  )

  evidencePatents.forEach((evidence, idx) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${idx + 1}. 證據 ${idx + 1}：${evidence.patent_number}，發明名稱「${evidence.title}」，申請日 ${evidence.application_date}，公開日 ${evidence.publication_date}`,
            size: 24,
            font: fontStyle
          })
        ],
        spacing: { after: 120 }
      })
    )
  })

  // ========== 建立文件 ==========
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ children: [PageNumber.CURRENT], font: fontStyle })
        ]
      })
    ]
  })

  return new Document({
    sections: [{
      properties: {
        page: { margin: pageMargins }
      },
      footers: { default: footer },
      children: children
    }]
  })
}

// ========================================
// 🆕 新增：建立專利鑑價報告 Docx - Enhancement 2
// ========================================
const createValuationReportDocx = (patentNumber, resultData) => {
  const fontStyle = '微軟正黑體'
  const pageMargins = {
    top: convertInchesToTwip(1),
    right: convertInchesToTwip(1), 
    bottom: convertInchesToTwip(1),
    left: convertInchesToTwip(1)
  }

  const children = []

  // ========== 標題 ==========
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: '專利鑑價預分析報告',
          font: fontStyle,
          size: 32,
          bold: true,
          color: '1f4e79'
        })
      ],
      spacing: { after: 360 }
    })
  )

  // ========== 專利資訊 ==========
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `專利號碼：${patentNumber}`,
          font: fontStyle,
          size: 24,
          bold: true
        })
      ],
      spacing: { after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `報告日期：${new Date().toLocaleDateString('zh-TW')}`,
          font: fontStyle,
          size: 24
        })
      ],
      spacing: { after: 240 }
    })
  )

  // ========== 免責聲明 ==========
  children.push(
    new Paragraph({
      text: '免責聲明',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '本報告為 AI 輔助之「價值預分析」，僅供內部決策、技術盤點或初步交易參考。',
          font: fontStyle,
          size: 22,
          bold: true,
          color: 'd32f2f'
        }),
        new TextRun({
          text: '本報告不具備會計師或認證鑑價師簽證效力，不可用於正式法庭訴訟、稅務申報或銀行融資抵押。',
          font: fontStyle,
          size: 22,
          color: 'd32f2f'
        })
      ],
      spacing: { after: 240 }
    })
  )

  // ========== 估值摘要 ==========
  children.push(
    new Paragraph({
      text: '估值摘要',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 }
    })
  )

  const valuationModel = resultData.valuation_model || {}
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '預估專利價值區間：',
          font: fontStyle,
          size: 24,
          bold: true
        }),
        new TextRun({
          text: `${valuationModel.estimated_value_min || 'N/A'} ~ ${valuationModel.estimated_value_max || 'N/A'}`,
          font: fontStyle,
          size: 26,
          bold: true,
          color: '1976d2'
        })
      ],
      spacing: { after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '平均估值：',
          font: fontStyle,
          size: 24,
          bold: true
        }),
        new TextRun({
          text: valuationModel.estimated_value_avg || 'N/A',
          font: fontStyle,
          size: 24,
          color: '388e3c'
        })
      ],
      spacing: { after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '計算基礎：',
          font: fontStyle,
          size: 22,
          bold: true
        }),
        new TextRun({
          text: `年營收 ${valuationModel.market_size_input || 'N/A'} × 費率 ${valuationModel.royalty_rate_range || 'N/A'} × 強度係數 ${valuationModel.strength_factor || 'N/A'}`,
          font: fontStyle,
          size: 22
        })
      ],
      spacing: { after: 240 }
    })
  )

  // ========== 三種方法詳細說明 ==========
  children.push(
    new Paragraph({
      text: '三種方法詳細說明',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 }
    })
  )

  // 成本法
  children.push(
    new Paragraph({
      text: '1. 成本法 (Cost Method)',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 120 }
    })
  )

  const costMethod = resultData.cost_method || {}
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `估值結果：${costMethod.total_cost_valuation ? '$' + costMethod.total_cost_valuation.toLocaleString('en-US', { maximumFractionDigits: 0 }) : 'N/A'}`,
          font: fontStyle,
          size: 22,
          bold: true
        })
      ],
      spacing: { after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: costMethod.explanation || '說明資料不可用',
          font: fontStyle,
          size: 22
        })
      ],
      spacing: { after: 180 }
    })
  )

  // 市場法
  children.push(
    new Paragraph({
      text: '2. 市場法 (Market Method)',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 120 }
    })
  )

  const marketMethod = resultData.market_method || {}
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `估值結果：${marketMethod.market_valuation ? '$' + marketMethod.market_valuation.toLocaleString('en-US', { maximumFractionDigits: 0 }) : 'N/A'}`,
          font: fontStyle,
          size: 22,
          bold: true
        })
      ],
      spacing: { after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: marketMethod.explanation || '說明資料不可用',
          font: fontStyle,
          size: 22
        })
      ],
      spacing: { after: 180 }
    })
  )

  // 收益法
  children.push(
    new Paragraph({
      text: '3. 收益法 (Income Method)',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 120 }
    })
  )

  const incomeMethod = resultData.income_method || {}
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `估值結果：${incomeMethod.income_valuation ? '$' + incomeMethod.income_valuation.toLocaleString('en-US', { maximumFractionDigits: 0 }) : 'N/A'}`,
          font: fontStyle,
          size: 22,
          bold: true
        })
      ],
      spacing: { after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: incomeMethod.explanation || '說明資料不可用',
          font: fontStyle,
          size: 22
        })
      ],
      spacing: { after: 240 }
    })
  )

  // ========== 質化分析 ==========
  children.push(
    new Paragraph({
      text: '質化分析',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 }
    })
  )

  const qualitativeAnalysis = resultData.qualitative_analysis || {}
  
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `法律強度分數：${qualitativeAnalysis.legal_score || 'N/A'}/100`,
          font: fontStyle,
          size: 22,
          bold: true
        })
      ],
      spacing: { after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `技術價值分數：${qualitativeAnalysis.tech_score || 'N/A'}/100`,
          font: fontStyle,
          size: 22,
          bold: true
        })
      ],
      spacing: { after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `商業潛力分數：${qualitativeAnalysis.commercial_score || 'N/A'}/100`,
          font: fontStyle,
          size: 22,
          bold: true
        })
      ],
      spacing: { after: 180 }
    })
  )

  // 法律面分析
  children.push(
    new Paragraph({
      text: '法律面分析',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: qualitativeAnalysis.legal_analysis || '法律面分析資料不可用',
          font: fontStyle,
          size: 22
        })
      ],
      spacing: { after: 180 }
    })
  )

  // 技術面分析
  children.push(
    new Paragraph({
      text: '技術面分析',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 180, after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: qualitativeAnalysis.tech_analysis || '技術面分析資料不可用',
          font: fontStyle,
          size: 22
        })
      ],
      spacing: { after: 240 }
    })
  )

  // ========== 方法論說明 ==========
  children.push(
    new Paragraph({
      text: '方法論說明',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: resultData.methodology_explanation || '方法論說明不可用',
          font: fontStyle,
          size: 22
        })
      ],
      spacing: { after: 240 }
    })
  )

  // ========== 信心水準 ==========
  children.push(
    new Paragraph({
      text: '信心水準',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `信心等級：${resultData.confidence_level || 'N/A'}`,
          font: fontStyle,
          size: 24,
          bold: true
        })
      ],
      spacing: { after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `信心百分比：${resultData.confidence_percentage ? resultData.confidence_percentage.toFixed(1) + '%' : 'N/A'}`,
          font: fontStyle,
          size: 22
        })
      ],
      spacing: { after: 240 }
    })
  )

  // ========== 總結 ==========
  children.push(
    new Paragraph({
      text: '總結',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 }
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: resultData.valuation_summary || '總結資料不可用',
          font: fontStyle,
          size: 22
        })
      ],
      spacing: { after: 240 }
    })
  )

  // ========== 建立文件 ==========
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: '第 ',
            font: fontStyle,
            size: 20
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: fontStyle,
            size: 20
          }),
          new TextRun({
            text: ' 頁',
            font: fontStyle,
            size: 20
          })
        ]
      })
    ]
  })

  return new Document({
    sections: [{
      properties: {
        page: { margin: pageMargins }
      },
      footers: { default: footer },
      children: children
    }]
  })
}

