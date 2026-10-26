import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/api-auth";
import {
  deleteDirectMessage,
  DmForbiddenError,
  DmNotFoundError,
  editDirectMessage,
} from "@/lib/services/dm.service";
import { dmEditSchema } from "@/lib/validators/dm";
import { broadcastDmEvent } from "@/lib/socket/dm-broadcast";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = dmEditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const message = await editDirectMessage(
      auth.userId,
      id,
      parsed.data.content,
    );

    await broadcastDmEvent(message.conversationId, "dm:edited", message);

    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof DmNotFoundError || error instanceof DmForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[dm message PATCH]", error);
    return NextResponse.json(
      { error: "Could not edit message." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    const result = await deleteDirectMessage(auth.userId, id);

    await broadcastDmEvent(result.conversationId, "dm:deleted", result);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DmNotFoundError || error instanceof DmForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[dm message DELETE]", error);
    return NextResponse.json(
      { error: "Could not delete message." },
      { status: 500 },
    );
  }
}
