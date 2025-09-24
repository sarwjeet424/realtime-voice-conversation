import React from "react";
import { Navigate } from "react-router-dom";

type ProtectedType = "user" | "admin";

export default function ProtectedRoute({ type, children }: { type: ProtectedType; children: JSX.Element; }) {
  const isAuthed = type === "admin"
    ? !!localStorage.getItem("adminAccessToken")
    : !!localStorage.getItem("userAccessToken");

  if (!isAuthed) {
    return <Navigate to={type === "admin" ? "/admin/login" : "/login"} replace />;
  }
  return children;
}


