import { Sparkles, Zap, ShieldCheck, Globe } from "lucide-react";

export function EmptyState() {
  const features = [
    {
      icon: Zap,
      title: "Real-time Answers",
      desc: "Instant responses powered by live data."
    },
    {
      icon: ShieldCheck,
      title: "Fact Verified",
      desc: "Information cross-referenced for accuracy."
    },
    {
      icon: Globe,
      title: "Global Sources",
      desc: "Deep search across trusted global domains."
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center animate-in fade-in zoom-in duration-500">
      <div className="h-16 w-16 mb-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/30">
        <Sparkles className="h-8 w-8 text-primary-foreground" />
      </div>
      
      <h1 className="text-3xl md:text-4xl font-display font-bold mb-4 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
        I am Globalrate AI
      </h1>
      <p className="text-muted-foreground max-w-md text-lg mb-12">
        Your real-time AI search and chat assistant. Ask me anything to get started.
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl w-full">
        {features.map((item, i) => (
          <div key={i} className="flex flex-col items-center p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
              <item.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold mb-1 text-foreground">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
