export {
  getUserGroups,
  getUserGroupById,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
  getUserGroupMembers,
  addUserToGroup,
  removeUserFromGroup,
  getUserGroupsByUserId,
  getAllUserGroupsMappings,
} from './api/user-groups-api'

export type {
  UserGroup,
  UserGroupWithMembers,
  CreateUserGroupDto,
  UpdateUserGroupDto,
  UserGroupMember,
} from './model/types'
