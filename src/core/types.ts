// Ticketmaster API response types
export interface TicketmasterEvent {
  id: string;
  name: string;
  dates: {
    start: {
      localDate?: string;
      localTime?: string;
    };
  };
  images?: { url: string; width: number; height: number }[];
  _embedded?: {
    venues?: { name: string; city?: { name: string } }[];
  };
}

export interface TicketmasterResponse {
  _embedded?: {
    events: TicketmasterEvent[];
  };
}

// Simplified event for our app
export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  imageUrl: string;
}
