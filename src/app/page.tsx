import Link from "next/link";
import Image from "next/image";
import { weddingImageSource } from "@/lib/wedding-images";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Heart,
  Mail,
  Users,
  Sparkles,
} from "lucide-react";

import { Header, Footer, SectionTitle } from "@/components/wedding/shell";
import {
  TemplateArtwork,
  TemplateCard,
} from "@/components/wedding/template-card";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";
export default async function Home() {
  const templates = await prisma.weddingTemplate.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    take: 3,
  });
  return (
    <>
      <Header />
      <main>
        <section className="home-hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="tiny-line" /> CHO NGÀY MÌNH CHUNG ĐÔI
            </p>
            <h1>
              Một lời mời.
              <br />
              Cả một đời <em>thương.</em>
            </h1>
            <p className="hero-description">
              Kể câu chuyện của hai bạn bằng một tấm thiệp cưới thật riêng. Tinh
              tế, dễ gửi và lưu giữ những điều đáng nhớ.
            </p>
            <div className="hero-actions">
              <Link href="/templates" className="button">
                Tìm tấm thiệp của bạn <ArrowUpRight size={18} />
              </Link>
              <Link className="text-link" href="/w/thiep-mau">
                Xem một lời mời <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-note">
              <span className="tiny-heart">
                <Heart size={17} />
              </span>
              <span>Thiết kế chỉn chu · Tạo bản nháp miễn phí</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo">
              <Image
                src={weddingImageSource("/images/couple.jpg")}
                alt="Cô dâu và chú rể trong lễ cưới ngoài trời"
                fill
                sizes="(max-width: 800px) 90vw, 42vw"
                priority
              />
              <span className="photo-caption">
                Một lời mời nhỏ, một đời bên nhau
              </span>
            </div>
            <div className="hero-invitation">
              <TemplateArtwork
                template={{ palette: "rose", layout: "editorial" }}
              />
            </div>
            <div className="floating-stamp">
              made
              <br />
              <em>for you</em>
              <span>✳</span>
            </div>
            <span className="hero-number">01 / YOUR LOVE, YOUR STORY</span>
          </div>
        </section>
        <section className="trust-strip">
          <span>MỘT TẤM THIỆP, ĐỦ ĐẦY YÊU THƯƠNG</span>
          <span>
            <Mail size={17} /> Gửi lời mời qua một đường link
          </span>
          <span>
            <Users size={17} /> Dễ dàng xác nhận tham dự
          </span>
          <span>
            <Heart size={17} /> Giữ lại những lời chúc
          </span>
        </section>
        <section className="section collection">
          <div className="section-heading-row">
            <SectionTitle
              eyebrow="BỘ SƯU TẬP ĐƯỢC CHĂM CHÚT"
              title="Mỗi chuyện tình, một nét riêng."
            >
              Từ dịu dàng tối giản đến trang trọng truyền thống.
            </SectionTitle>
            <Link className="text-link" href="/templates">
              Xem tất cả mẫu <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="template-grid">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </section>
        <section className="story-section">
          <div className="story-image">
            <Image
              src="/images/flowers.jpg"
              alt="Hoa và chi tiết trang trí tiệc cưới"
              fill
              sizes="(max-width: 800px) 100vw, 45vw"
            />
          </div>
          <div className="story-copy">
            <p className="eyebrow">KHÔNG CHỈ LÀ MỘT TẤM THIỆP</p>
            <h2>
              Những điều nhỏ,
              <br />
              làm nên ngày <em>thật đẹp.</em>
            </h2>
            <p>
              Album kỷ niệm, lịch tiệc hai nhà, bản đồ và lời chúc từ người thân
              — tất cả ở cùng một nơi.
            </p>
            <ul className="feature-list">
              <li>
                <Check size={17} /> Một đường link, mở đẹp trên điện thoại
              </li>
              <li>
                <Check size={17} /> Lời mời riêng cho từng người bạn quý
              </li>
              <li>
                <Check size={17} /> Quản lý khách tham dự, xuất danh sách dễ
                dàng
              </li>
            </ul>
            <Link className="text-link" href="/pricing">
              Chọn gói phù hợp <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
        <section className="section steps-section">
          <SectionTitle
            eyebrow="TỪ Ý TƯỞNG ĐẾN LỜI MỜI"
            title="Đơn giản để bắt đầu. Đẹp để nhớ mãi."
          />
          <div className="steps-grid">
            {[
              {
                icon: Sparkles,
                title: "Chọn một nét riêng",
                body: "Tìm mẫu thiệp hợp với câu chuyện và phong cách của hai bạn.",
              },
              {
                icon: Heart,
                title: "Thêm câu chuyện của bạn",
                body: "Điền thông tin, tải những tấm ảnh yêu thích và xem thử trước khi gửi.",
              },
              {
                icon: Mail,
                title: "Gửi đi niềm hạnh phúc",
                body: "Kích hoạt gói dịch vụ, xuất bản và gửi lời mời đến người thân.",
              },
            ].map((s, i) => (
              <article key={s.title}>
                <span className="step-number">0{i + 1}</span>
                <s.icon size={26} strokeWidth={1.2} />
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="closing-cta">
          <p className="eyebrow">HẠNH PHÚC BẮT ĐẦU TỪ ĐÂY</p>
          <h2>
            Viết lời mời cho ngày
            <br />
            đẹp nhất của <em>hai bạn.</em>
          </h2>
          <Link className="button" href="/dashboard/new">
            Bắt đầu tạo thiệp <ArrowUpRight size={18} />
          </Link>
          <p className="fine">Tạo bản nháp và xem thử trước khi mua gói.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
