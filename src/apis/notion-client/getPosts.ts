import { CONFIG } from "site.config"
import { NotionAPI } from "notion-client"
import { idToUuid } from "notion-utils"

import getAllPageIds from "src/libs/utils/notion/getAllPageIds"
import getPageProperties from "src/libs/utils/notion/getPageProperties"
import { TPosts } from "src/types"

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */

// TODO: react query를 사용해서 처음 불러온 뒤로는 해당데이터만 사용하도록 수정
export const getPosts = async () => {
  let id = CONFIG.notionConfig.pageId as string
  const api = new NotionAPI({
   authToken:  CONFIG.notionToken.token as string
  })
  const response = await api.getPage(id)
  
  // 1. 응답 객체의 최상위 키값들 확인 (데이터가 구조적으로 들어왔는지 확인)
  console.log("RESPONSE_KEYS:", Object.keys(response))
  
  // 2. block 객체 안에 어떤 ID들이 들어있는지 확인 (우리가 가진 ID와 비교용)
  if (response.block) {
    console.log("BLOCK_KEYS_SAMPLE:", Object.keys(response.block).slice(0, 5))
  }
  
  id = idToUuid(id)
  const collection = Object.values(response.collection)[0]?.value
  const block = response.block
  const schema = collection?.schema

  console.log("TARGET_ID:", id)
  console.log("IS_TARGET_ID_IN_BLOCK:", !!block[id])
  
  const rawMetadata = block[id].value
  console.log("RAW_METADATA_VALUE:", JSON.stringify(rawMetadata, null, 2))

  // Check Type
  if (
    rawMetadata?.type !== "collection_view_page" &&
    rawMetadata?.type !== "collection_view"
  ) {
    return []
  } else {
    // Construct Data
    const pageIds = getAllPageIds(response)
    const data = []
    for (let i = 0; i < pageIds.length; i++) {
      const id = pageIds[i]
      const properties = (await getPageProperties(id, block, schema)) || null
      // Add fullwidth, createdtime to properties
      properties.createdTime = new Date(
        block[id].value?.created_time
      ).toString()
      properties.fullWidth =
        (block[id].value?.format as any)?.page_full_width ?? false

      data.push(properties)
    }
    // Sort by date
    data.sort((a: any, b: any) => {
      const dateA: any = new Date(a?.date?.start_date || a.createdTime)
      const dateB: any = new Date(b?.date?.start_date || b.createdTime)
      return dateB - dateA
    })

    const posts = data as TPosts
    return posts
  }
}
