// Публичное API для entities/projects

export { projectsApi, blocksApi, blockConnectionsApi } from './api/projects-api'
export type {
  Project,
  Block,
  ProjectBlock,
  BlockFloorMapping,
  BlockConnectionsMapping,
  UIBlock,
  UIStylobate,
  UIUndergroundParking,
  ProjectCardData,
  ConnectionType,
  BlockType,
} from './model/types'
