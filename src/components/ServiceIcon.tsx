import { Wifi, Phone, Zap, Droplet, CheckCircle2, MonitorSmartphone } from "lucide-react";

interface ServiceIconProps {
  type?: string;
  className?: string;
}

export function ServiceIcon({ type, className = "w-8 h-8" }: ServiceIconProps) {
  switch (type) {
    case 'wifi':
      return <Wifi className={className} />;
    case 'phone':
      return <Phone className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'droplet':
      return <Droplet className={className} />;
    case 'check':
      return <CheckCircle2 className={className} />;
    default:
      return <MonitorSmartphone className={className} />;
  }
}
