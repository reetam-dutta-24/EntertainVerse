import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/api-auth";
import {
  DmForbiddenError,
  DmNotFoundError,
  listMessagesForConversation,
  sendDirectMessage,
} from "@/lib/services/dm.service";
import { dmSendSchema } from "@/lib/validators/dm";
import { broadcastDmEvent } from "@/lib/socket/dm-broadcast";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    const messages = await listMessagesForConversation(auth.userId, id);
    return NextResponse.json({ messages });
  } catch (error) {
    if (error instanceof DmNotFoundError || error instanceof DmForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[dm messages GET]", error);
    return NextResponse.json(
      { error: "Could not load messages." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = dmSendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const message = await sendDirectMessage(
      auth.userId,
      parsed.data.recipientHandle,
      parsed.data.content,
    );

    if (message.conversationId === id) {
      await broadcastDmEvent(id, "dm:message", message);
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof DmNotFoundError || error instanceof DmForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[dm messages POST]", error);
    return NextResponse.json(
      { error: "Could not send message." },
      { status: 500 },
    );
  }
}
