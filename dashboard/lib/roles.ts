import { Role } from "@prisma/client";

export function isAdmin(role?: string | null) {
  return role === Role.ADMIN;
}

export function isContributor(role?: string | null) {
  return role === Role.CONTRIBUTOR;
}

export function canWrite(role?: string | null) {
  return role === Role.ADMIN || role === Role.CONTRIBUTOR;
}
