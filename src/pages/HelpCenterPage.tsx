import React, { useState } from "react";
import {
  Search,
  GraduationCap,
  Briefcase,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  LifeBuoy,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FAQItem {
  question: string;
  answer: string;
  category: "Student" | "Faculty" | "General";
}

const FAQS: FAQItem[] = [
  {
    category: "General",
    question: "Who is eligible to access the Apollo University Event Hub?",
    answer:
      "All active students, faculty members, researchers, and campus administrators holding an official @apollouniversity.edu.in Microsoft account have access.",
  },
  {
    category: "Student",
    question: "How do I download my Participation Certificate?",
    answer:
      "Navigate to 'My Transcript' in the top navigation bar. After the event coordinator checks you in at the gate, your verified certificate becomes available for instant 1-click PDF download.",
  },
  {
    category: "Student",
    question: "What payment methods are supported for paid event passes?",
    answer:
      "We support all UPI apps (Google Pay, PhonePe, Paytm), Visa/Mastercard/RuPay credit & debit cards, net banking across all major Indian banks, and digital wallets via our secure Razorpay integration.",
  },
  {
    category: "Faculty",
    question: "How does the event approval workflow operate?",
    answer:
      "When you submit a new event from the Faculty Portal, it enters the Admin Approvals Queue. Campus administrators verify the schedule, venue clash check, and pricing before publishing it live.",
  },
  {
    category: "Faculty",
    question: "Can I undo a student check-in if scanned by mistake?",
    answer:
      "Yes! On the Check-In screen under the 'Manual Roster' tab, an 'Undo' button is available for 5 minutes after each check-in.",
  },
  {
    category: "Faculty",
    question: "How do I submit the NAAC / NBA Post-Event Report?",
    answer:
      "From your Faculty Dashboard or Reports Index (/faculty/reports), click 'Submit Report' on any completed event. The 7-section builder autosaves every 30 seconds and generates an official institutional accreditation PDF.",
  },
];

export const HelpCenterPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({
    0: true,
  });

  const toggleAccordion = (idx: number) => {
    setExpandedIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const filteredFaqs = FAQS.filter((faq) => {
    const matchCategory = activeCategory === "All" || faq.category === activeCategory;
    const matchQuery =
      !searchQuery.trim() ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchQuery;
  });

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Knowledge Base &amp; Help Center"
        description="Comprehensive user guides, accreditation resources, ticket policies, and campus support directory."
        badge={{ text: "Assistance & Support", variant: "indigo" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Search Header Banner */}
        <Card className="p-8 rounded-3xl bg-slate-900 text-white border-0 shadow-xl space-y-4">
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Campus Support Directory
            </span>
            <h2 className="text-2xl font-black">How can we assist you today?</h2>
            <p className="text-xs text-slate-300">
              Search frequently asked questions, guidelines, or browse role-specific user manuals.
            </p>
          </div>

          <div className="max-w-xl mx-auto relative pt-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help articles, refunds, ticket passes, certificates..."
              className="h-11 pl-10 text-xs rounded-2xl bg-white text-slate-900 border-0"
            />
          </div>
        </Card>

        {/* User Manuals Quick Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 rounded-3xl border-slate-200/90 shadow-sm bg-white hover:border-indigo-300 transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Student User Manual</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Step-by-step instructions on discovering campus events, booking passes, payment checkout, and transcript certificates.
            </p>
            <div className="pt-2">
              <Badge variant="indigo" className="text-[10px]">
                docs/USER_GUIDE_STUDENT.md
              </Badge>
            </div>
          </Card>

          <Card className="p-6 rounded-3xl border-slate-200/90 shadow-sm bg-white hover:border-indigo-300 transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Faculty Organiser Guide</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Comprehensive walkthrough of the 4-step event creator, mobile QR gate scanner, and NAAC / NBA post-event reporting.
            </p>
            <div className="pt-2">
              <Badge variant="emerald" className="text-[10px]">
                docs/USER_GUIDE_FACULTY.md
              </Badge>
            </div>
          </Card>

          <Card className="p-6 rounded-3xl border-slate-200/90 shadow-sm bg-white hover:border-indigo-300 transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Admin Console &amp; Runbook</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Access approvals, roster allowlist imports, system singleton parameters, secret rotation, and daily disaster recovery.
            </p>
            <div className="pt-2">
              <Badge variant="amber" className="text-[10px]">
                docs/RUNBOOK.md
              </Badge>
            </div>
          </Card>
        </div>

        {/* FAQs Accordion */}
        <Card className="p-8 rounded-3xl border-slate-200/90 bg-white shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Frequently Asked Questions</h3>
              <p className="text-xs text-slate-500">Instant answers to common platform questions</p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
              {["All", "Student", "Faculty", "General"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                    activeCategory === cat
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, idx) => {
                const isOpen = Boolean(expandedIndices[idx]);
                return (
                  <div key={idx} className="py-3.5">
                    <button
                      type="button"
                      onClick={() => toggleAccordion(idx)}
                      className="w-full flex items-center justify-between text-left gap-4 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                          {faq.category}
                        </Badge>
                        <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">
                          {faq.question}
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <p className="text-xs text-slate-600 leading-relaxed pt-2 pl-12 pr-4">
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No help questions matched your search query.
              </div>
            )}
          </div>
        </Card>

        {/* Contact Campus IT Support */}
        <Card className="p-6 rounded-3xl border-slate-200/90 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-slate-900">Still need assistance?</h4>
              <p className="text-[11px] text-slate-500">Contact The Apollo University IT Helpdesk</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 h-8 bg-white">
              <a href="mailto:it.support@apollouniversity.edu.in">
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>it.support@apollouniversity.edu.in</span>
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 h-8 bg-white">
              <a href="tel:+918772277777">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>+91 877 227 7777</span>
              </a>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
export default HelpCenterPage;
