import { NextResponse } from "next/server";

import { deleteAuthenticatedAccount } from "@/lib/account-service";

export async function DELETE() {
  const result = await deleteAuthenticatedAccount();

  if (!result.ok && result.reason === "unauthenticated") {
    return NextResponse.json({
      error: "Authentication is required to delete this account",
      requiresUserIdentity: true,
    }, { status: 401 });
  }

  if (!result.ok) {
    return NextResponse.json({
      error: "Account deletion is temporarily unavailable",
      retryable: true,
    }, { status: 503 });
  }

  return NextResponse.json({ deleted: true });
}
