import type { IClient } from './IClient'

export interface IFactory {
  getClient(_networkChainId: number): IClient | null
}
