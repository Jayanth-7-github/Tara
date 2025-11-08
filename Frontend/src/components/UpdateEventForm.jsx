// This wrapper kept for backward compatibility. Prefer importing `EventForm` directly.
import EventForm from "./EventForm";

export default function UpdateEventForm(props) {
  // props: { event, onSuccess }
  if (!props?.event) return null;
  return (
    <EventForm
      {...(props || {})}
      mode="edit"
      eventId={props.event?._id}
      initialData={props.event}
    />
  );
}
