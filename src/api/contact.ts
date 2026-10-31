import { apiFetch } from "./client";

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  createdAt: string;
}

export const sendContactMessage = (input: ContactInput) =>
  apiFetch<null>("/api/contact", { method: "POST", json: input });

export const getContactSubmissions = () =>
  apiFetch<ContactSubmission[]>("/api/admin/contact-submissions");
