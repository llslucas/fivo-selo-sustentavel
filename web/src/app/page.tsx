import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import WhyTransparency from "@/components/home/WhyTransparency";
import PartnerCompanies from "@/components/home/PartnerCompanies";
import CtaBanner from "@/components/home/CtaBanner";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <WhyTransparency />
        <PartnerCompanies />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
