// This wrapper kept for backward compatibility. You can import `EventForm` directly.
import EventForm from "./EventForm";

export default function CreateEventForm(props) {
  return <EventForm {...props} mode="create" />;
}
