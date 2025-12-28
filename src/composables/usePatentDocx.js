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
  TabStopPosition
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
      console.log('📊 前端接收圖式清單數量:', figures.length)

      if (!content) throw new Error('內容為空，無法生成文件')

      // 1. 預先下載所有圖片
      const imageBuffers = {} // 格式: { "1": Buffer, "2": Buffer }
      
      if (figures && figures.length > 0) {
        console.log('⏳ 正在下載圖片資源...')
        
        // 使用 Promise.all 並行下載
        await Promise.all(figures.map(async (fig) => {
          if (fig.url) {
            const buffer = await fetchImageBuffer(fig.url)
            if (buffer) {
              // 轉成字串 Key 確保匹配 (例如 "1")
              imageBuffers[String(fig.fig_number)] = buffer
            }
          }
        }))
        
        console.log(`✅ 有效圖片資源: ${Object.keys(imageBuffers).length} 張`)
      }

      // 2. 建立 Docx 物件 (傳入 figures 陣列以確保順序)
      const doc = createDocxFromMarkdown(content, title, type, imageBuffers, figures)

      // 3. 轉為 Blob
      const blob = await Packer.toBlob(doc)
      
      // 4. 統一檔名
      const timestamp = Date.now()
      const typeLabel = type === 'invention' ? 'invention' : 'utility'
      const hasImages = Object.keys(imageBuffers).length > 0
      const suffix = hasImages ? '_with_figures' : ''
      const filename = `patent_${typeLabel}${suffix}_${timestamp}.docx`

      console.log('📄 產生檔案:', filename)

      // 5. 執行下載
      if (mode.includes('download')) {
        saveAs(blob, filename)
      }

      // 6. 執行上傳
      let publicUrl = null
      if (mode.includes('upload') && userId && jobId) {
        publicUrl = await uploadToStorage(userId, jobId, filename, blob)
      }

      return { 
        success: true, 
        filename, 
        publicUrl,
        figuresIncluded: Object.keys(imageBuffers).length
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

  return {
    isGenerating,
    error,
    generateAndHandleDocx,
    generateApplicationForm // 🆕 新增
  }
}
