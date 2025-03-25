
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export function LocationMap() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // In a real implementation, we would load a proper map library like Google Maps or Mapbox
    // For demo purposes, we're using a static image
    setMapLoaded(true);
  }, []);
  
  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-0 relative">
        <div ref={mapRef} className="w-full h-[400px] md:h-[500px] overflow-hidden relative">
          {/* Using a static map image of Baguio City */}
          <img 
            src="https://maps.googleapis.com/maps/api/staticmap?center=Baguio+City,Philippines&zoom=14&size=1200x500&scale=2&maptype=roadmap&markers=color:red%7CSession+Road,Baguio+City,Philippines" 
            alt="Map of Baguio City" 
            className="w-full h-full object-cover"
          />
          
          {/* Overlay for clinic location */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-pet-blue-dark text-white px-3 py-1 rounded-md shadow-lg flex items-center gap-2 whitespace-nowrap">
              <MapPin size={16} />
              <span>Purrfect Paw Clinic</span>
            </div>
          </div>
          
          {/* Nearby locations - these would be dynamically populated in a real app */}
          <div className="absolute top-1/3 left-1/4">
            <div className="bg-white text-pet-blue-dark px-2 py-1 rounded-md shadow-sm text-xs">
              Burnham Park Vet
            </div>
          </div>
          
          <div className="absolute bottom-1/3 right-1/4">
            <div className="bg-white text-pet-blue-dark px-2 py-1 rounded-md shadow-sm text-xs">
              SM City Animal Clinic
            </div>
          </div>
          
          <div className="absolute top-1/4 right-1/3">
            <div className="bg-white text-pet-blue-dark px-2 py-1 rounded-md shadow-sm text-xs">
              Baguio Animal Hospital
            </div>
          </div>
        </div>
        
        {/* Map controls/legend */}
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3">
          <div className="text-sm font-medium mb-2">Location Legend</div>
          
          <div className="flex items-center gap-2 text-xs mb-1">
            <div className="w-3 h-3 rounded-full bg-pet-blue-dark"></div>
            <span>Our Clinic</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span>Other Veterinary Clinics</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
