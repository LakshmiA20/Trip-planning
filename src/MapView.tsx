import { useState } from 'react';
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react';

type MapDay={id:number;date:string;activities:{id:number;name:string;start:string;location:string;category:string}[]};
type Props={destination?:{id:string;name:string};days?:MapDay[]};
const regions:Record<string,{box:string;marker:string}>={
  goa:{box:'73.69,15.30,74.15,15.66',marker:'15.4989,73.8278'},
  manali:{box:'77.12,32.16,77.25,32.31',marker:'32.2396,77.1887'},
  jaipur:{box:'75.72,26.83,75.91,27.02',marker:'26.9124,75.7873'},
  kerala:{box:'76.25,9.34,76.49,9.59',marker:'9.4981,76.3388'},
  mumbai:{box:'72.77,18.90,73.02,19.19',marker:'18.9388,72.8354'},
  bali:{box:'115.20,-8.65,115.35,-8.45',marker:'-8.5069,115.2625'}
};
export default function MapView({destination,days=[]}:Props){
 const [selected,setSelected]=useState(days[0]?.id);
 const region=regions[destination?.id||'goa']||regions.goa;
 const day=days.find(d=>d.id===selected)||days[0];
 const mapUrl=`https://www.openstreetmap.org/export/embed.html?bbox=${region.box}&layer=mapnik&marker=${region.marker}`;
 return <section className="map-page"><div className="content-title"><div><span className="eyebrow">FIND YOUR WAY AROUND</span><h2>{destination?.name||'Your trip'}, at a glance</h2><p>Get a feel for the area and open a stop in OpenStreetMap.</p></div></div><div className="map-layout"><div className="live-map"><iframe title={`OpenStreetMap map of ${destination?.name||'your destination'}`} src={mapUrl} loading="lazy"/><a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(destination?.name||'Goa')}`} target="_blank" rel="noreferrer" className="map-open-link">Open full map <ArrowUpRight size={14}/></a></div><div className="map-stops"><div className="map-stops-head"><span className="eyebrow">YOUR STOPS</span><span>{day?.activities.length||0} today</span></div><div className="map-day-select">{days.map((d,i)=><button key={d.id} className={selected===d.id?'active':''} onClick={()=>setSelected(d.id)}>Day {i+1}<small>{new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN',{weekday:'short',day:'numeric'})}</small></button>)}</div>{day?.activities.length?day.activities.map((a,i)=><a className="map-stop" key={a.id} href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${a.location} ${destination?.name||''}`)}`} target="_blank" rel="noreferrer"><span className="map-stop-number">{i+1}</span><span><b>{a.name}</b><small><CalendarDays size={12}/>{a.start} · {a.location}</small></span><MapPin size={15}/></a>):<div className="map-empty">Nothing on this day yet. Add a plan to see it here.</div>}</div></div><p className="map-credit">Map data © OpenStreetMap contributors · Pins shown in the activity list open the location in OpenStreetMap.</p></section>;
}
