import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import RegisterForm from "../components/RegisterForm";

export default function EventRegister() {
  const { eventId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const eventTitle = location.state?.eventTitle || "Event";

  return (
    <RegisterForm
      eventId={eventId}
      fullPage
      eventTitle={eventTitle}
      onBack={() => navigate(-1)}
    />
  );
}
