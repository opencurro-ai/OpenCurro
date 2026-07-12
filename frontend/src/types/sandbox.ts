export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number | null
  modified_time?: string | null
  children?: FileTreeNode[]
}

export interface SandboxFilesResponse {
  path: string
  tree: FileTreeNode[]
  sandbox?: {
    sandbox_id: string
    provider: string
    root_path: string
    created_at: string
    timeout_seconds: number
    template_id?: string | null
  } | null
}