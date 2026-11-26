import uz from "@/locales/uz.json";

export type Messages = typeof uz;

export function getMessages(): Messages {
  return uz;
}
