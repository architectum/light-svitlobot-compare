import { Layout } from "@/components/Layout";
import { Mail, Phone, MapPin, Clock, Send, User, Briefcase, Award, Globe, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const contactBlocks = [
  {
    icon: User,
    title: "Ім'я",
    value: "Євгеній Іванець",
  },
  {
    icon: Briefcase,
    title: "Позиції",
    value: "Software Architect/Tech Lead/CTO (12 років в IT)",
  },
  {
    icon: Award,
    title: "Експертиза",
    value: "Python, TypeScript/Javascript full-stack, Node.js, React, PHP, Розробка Web-додатків, Розробка Mobile додатків (iOS, Android), Розробка автоматизацій, Розробка ботів, Розробка кастомних IoT рішень",
  },
  {
    icon: Globe,
    title: "Домени",
    value: "E-commerce, Helthcare, Gov-trading, Automation, IoT",
  },
  {
    icon: Mail,
    title: "Email",
    value: "evgeniyivanets@gmail.com",
  },
  {
    icon: MessageCircle,
    title: "Telegram",
    value: "@notahumman",
  }
];

export default function Contacts() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Contact</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">Contact Us</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            We’re here to help with sales, support, and partnership inquiries.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {contactBlocks.map((block) => {
            const Icon = block.icon;
            return (
              <Card key={block.title} className="border-border/60 shadow-sm bg-white/90">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {block.title}
                    </p>
                    <p className="text-lg font-medium text-foreground mt-1">{block.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-white to-primary/5">
          <CardContent className="p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">Quick Response</h2>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Prefer a quick response? Use the form below and we’ll get back within 1 business day.
              </p>
            </div>
            <Button className="gap-2 px-6 py-5 text-base shadow-lg shadow-primary/20">
              <Send className="h-4 w-4" />
              Start a Request
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
