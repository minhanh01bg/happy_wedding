import { HomeMotion } from "@/components/wedding/home-motion";
import Link from "next/link";
import Image from "next/image";
import { DEMO_PHOTOS, weddingImageSource } from "@/lib/wedding-images";
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
      <HomeMotion>
        <main className="studio-landing">
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
                Kể câu chuyện của hai bạn bằng một tấm thiệp cưới thật riêng.
                Tinh tế, dễ gửi và lưu giữ những điều đáng nhớ.
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
                  alt="Ảnh cưới của cô dâu và chú rể"
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
          <section className="love-showcase" aria-labelledby="showcase-title">
            <div className="showcase-stage">
              <div className="showcase-heading">
                <p className="eyebrow">ĐỂ CÂU CHUYỆN ĐƯỢC CẤT LỜI</p>
                <h2 id="showcase-title">
                  Một ngày trọng đại.
                  <br />
                  <em>Vạn điều muốn kể.</em>
                </h2>
                <p>
                  Những tấm ảnh, một bản nhạc, lời hẹn chung đôi.
                  <br />
                  Đặt vào tấm thiệp, giữ lại thành kỷ niệm.
                </p>
              </div>
              <div
                className="showcase-photos"
                aria-label="Album ảnh cưới minh họa"
              >
                {DEMO_PHOTOS.slice(1, 6).map((photo, index) => (
                  <figure
                    key={photo}
                    className={`showcase-print showcase-print-${index}`}
                  >
                    <div>
                      <Image
                        src={photo}
                        alt={`Khoảnh khắc cưới minh họa ${index + 1}`}
                        fill
                        sizes="(max-width: 700px) 60vw, 25vw"
                      />
                    </div>
                    <figcaption>
                      {
                        [
                          "Nụ cười của chúng mình",
                          "Chỉ cần có nhau",
                          "Ngày mình chung đôi",
                          "Một đời thương",
                          "Hẹn nhau mãi về sau",
                        ][index]
                      }
                    </figcaption>
                  </figure>
                ))}
              </div>
              <Link href="/w/thiep-mau" className="showcase-link text-link">
                Mở thiệp và cảm nhận <ArrowUpRight size={18} />
              </Link>
              <span className="showcase-scroll" aria-hidden="true">
                CUỘN ĐỂ LƯU GIỮ YÊU THƯƠNG ↓
              </span>
            </div>
          </section>
          <section
            className="studio-benefits section"
            aria-labelledby="benefits-title"
          >
            <div className="benefits-intro">
              <p className="eyebrow">ĐẸP TRONG TỪNG CHI TIẾT</p>
              <h2 id="benefits-title">
                Chăm chút lời mời.
                <br />
                <em>Thảnh thơi ngày cưới.</em>
              </h2>
              <p>
                Từ lúc gửi thiệp đến khi gặp nhau, mọi điều cần thiết đã ở ngay
                trong lời mời.
              </p>
              <Link href="/templates" className="text-link">
                Khám phá mẫu thiệp <ArrowRight size={18} />
              </Link>
            </div>
            <div className="benefits-grid">
              {[
                {
                  icon: Heart,
                  number: "01",
                  title: "Có câu chuyện của hai bạn",
                  body: "Album ảnh, những dấu mốc và nhạc nền làm nên một lời mời mang dấu ấn riêng.",
                },
                {
                  icon: Mail,
                  number: "02",
                  title: "Gửi đi thật nhẹ nhàng",
                  body: "Chia sẻ đường link qua Zalo, Messenger hoặc gửi lời mời riêng cho từng khách.",
                },
                {
                  icon: Users,
                  number: "03",
                  title: "Biết ai sẽ chung vui",
                  body: "Khách xác nhận ngay trên thiệp. Hai bạn theo dõi và xuất danh sách tại trang quản lý.",
                },
                {
                  icon: Sparkles,
                  number: "04",
                  title: "Đủ đầy cho ngày trọng đại",
                  body: "Lịch tiệc, chỉ đường, lời chúc và QR mừng cưới cùng hiện diện trong một tấm thiệp.",
                },
              ].map(({ icon: Icon, number, title, body }) => (
                <article key={number}>
                  <span className="benefit-number">{number}</span>
                  <Icon size={25} strokeWidth={1.3} />
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="story-section">
            <div className="story-image">
              <Image
                src="/images/wedding-couple-traditional.jpg"
                alt="Khoảnh khắc cưới trong trang phục truyền thống"
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
                Album kỷ niệm, lịch tiệc hai nhà, bản đồ và lời chúc từ người
                thân — tất cả ở cùng một nơi.
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
          <section className="studio-faq section" aria-labelledby="faq-title">
            <div>
              <p className="eyebrow">TRƯỚC KHI BẮT ĐẦU</p>
              <h2 id="faq-title">
                Một vài điều
                <br />
                <em>bạn muốn biết.</em>
              </h2>
            </div>
            <div className="faq-list">
              {[
                [
                  "Tôi có thể xem thử trước khi mua không?",
                  "Có. Bạn có thể tạo bản nháp và xem thử trước khi chọn gói. Thiệp được xuất bản sau khi gói dịch vụ được kích hoạt.",
                ],
                [
                  "Khách mời có cần tải ứng dụng không?",
                  "Không cần. Khách mở đường link trên trình duyệt để xem thông tin, chỉ đường, gửi lời chúc và xác nhận tham dự.",
                ],
                [
                  "Tôi có thể dùng ảnh và nhạc của mình không?",
                  "Bạn có thể tải ảnh, chỉnh nội dung và chọn nhạc trong phần biên tập thiệp. Số lượng ảnh phụ thuộc vào quyền lợi của gói dịch vụ.",
                ],
                [
                  "Làm sao biết ai sẽ đến dự tiệc?",
                  "Phản hồi của khách được lưu trong trang quản lý thiệp. Bạn có thể theo dõi xác nhận tham dự và xuất danh sách để chuẩn bị cho ngày cưới.",
                ],
              ].map(([question, answer]) => (
                <details key={question}>
                  <summary>
                    {question}
                    <span aria-hidden="true">+</span>
                  </summary>
                  <p>{answer}</p>
                </details>
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
      </HomeMotion>
      <Footer />
    </>
  );
}
