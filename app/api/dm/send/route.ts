import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/api-auth";
import {
  DmForbiddenError,
  getOrCreateConversation,
  sendDirectMessage,
} from "@/lib/services/dm.service";
import { dmSendSchema } from "@/lib/validators/dm";
import { broadcastDmEvent } from "@/lib/socket/dm-broadcast";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = dmSendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const recipient = await prisma.user.findUnique({
      where: { handle: parsed.data.recipientHandle },
      select: { id: true },
    });
    if (!recipient) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const conversation = await getOrCreateConversation(
      auth.userId,
      recipient.id,
    );
    const message = await sendDirectMessage(
      auth.userId,
      parsed.data.recipientHandle,
      parsed.data.content,
    );

    await broadcastDmEvent(conversation.id, "dm:message", message);

    return NextResponse.json(
      { conversationId: conversation.id, message },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DmForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[dm send POST]", error);
    return NextResponse.json(
      { error: "Could not send message." },
      { status: 500 },
    );
  }
}
