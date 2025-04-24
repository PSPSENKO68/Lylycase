import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader, AlertCircle, ShieldCheck, Printer, Recycle, Clock, Star, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Type definitions
interface CaseType {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
}

interface InventorySummary {
  caseTypeId: number;
  totalAvailable: number;
}

interface PhoneModel {
  id: string;
  name: string;
  brand: string;
}

interface GroupedCases {
  [brand: string]: {
    models: PhoneModel[];
    cases: {
      [caseType: string]: CaseType[];
    };
  };
}

interface Review {
  id: number;
  name: string;
  rating: number;
  comment: string;
  date: string;
  avatar?: string;
}

// Constants
const FALLBACK_CASE_IMAGE = "https://images.unsplash.com/photo-1606041011872-596597976b25?auto=format&fit=crop&q=80";
const BRANDS = ['iPhone', 'Samsung', 'Google Pixel'];
const CASE_TYPES = ['Tough Case', 'Clear Case', 'Silicone Case', 'Leather Case', 'MagSafe Case'];
const CUSTOMIZABLE_CASE_TYPES = ['Tough Case', 'Silicone Case', 'Clear Case'];
const DIRECT_BUY_CASE_TYPES = ['Leather Case', 'MagSafe Case'];

// Partner logos - reliable image URLs
const PARTNERS = [
  { name: "OPPO", logo: "https://logos-world.net/wp-content/uploads/2020/07/Oppo-Logo.png" },
  { name: "Samsung", logo: "https://logos-world.net/wp-content/uploads/2020/04/Samsung-Logo.png" },
  { name: "Apple", logo: "https://logos-world.net/wp-content/uploads/2020/04/Apple-Logo.png" },
  { name: "Viettel", logo: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Viettel_logo_2021.svg" },
  { name: "MB Bank", logo: "https://upload.wikimedia.org/wikipedia/commons/2/25/Logo_MB_new.png" },
  { name: "Vinaphone", logo: "https://upload.wikimedia.org/wikipedia/commons/9/94/Logo_Vinaphone_2018.png" },
  { name: "Vietnam Airlines", logo: "https://upload.wikimedia.org/wikipedia/vi/b/bc/Vietnam_Airlines_logo.svg" },
];

// User reviews - fake data
const USER_REVIEWS: Review[] = [
  {
    id: 1,
    name: "Nguyễn Văn A",
    rating: 5,
    comment: "Chất lượng ốp lưng rất tốt, tôi đã làm rơi điện thoại nhiều lần nhưng không bị hư hại gì. Thiết kế cũng rất đẹp!",
    date: "05/10/2023",
    avatar: "https://i.pravatar.cc/150?img=1"
  },
  {
    id: 2,
    name: "Trần Thị B",
    rating: 4,
    comment: "Tôi rất thích mẫu ốp lưng tùy chỉnh của mình. Chỉ tiếc là phải đợi giao hàng hơi lâu.",
    date: "23/11/2023",
    avatar: "https://i.pravatar.cc/150?img=2"
  },
  {
    id: 3,
    name: "Lê Văn C",
    rating: 5,
    comment: "Chính sách bảo hành rất tốt. Ốp lưng của tôi bị nứt sau 3 tháng và đã được đổi miễn phí.",
    date: "12/12/2023",
    avatar: "https://i.pravatar.cc/150?img=3"
  },
  {
    id: 4,
    name: "Phạm Thị D",
    rating: 5,
    comment: "In ấn sắc nét, màu sắc đẹp. Sau 6 tháng sử dụng vẫn không bị phai màu hay xuống cấp.",
    date: "15/01/2024",
    avatar: "https://i.pravatar.cc/150?img=4"
  },
  {
    id: 5,
    name: "Hoàng Văn E",
    rating: 4,
    comment: "Dịch vụ khách hàng rất chu đáo. Tôi được tư vấn nhiệt tình để chọn được mẫu ốp lưng phù hợp.",
    date: "20/02/2024",
    avatar: "https://i.pravatar.cc/150?img=5"
  },
  {
    id: 6,
    name: "Ngô Thị F",
    rating: 5,
    comment: "Đây là lần thứ 3 tôi mua ốp lưng từ cửa hàng này. Chất lượng luôn ổn định và giá cả hợp lý.",
    date: "18/03/2024",
    avatar: "https://i.pravatar.cc/150?img=6"
  },
];

// Helper function to check if an image exists
const imageExists = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

export function Home() {
  const [popularCases, setPopularCases] = useState<CaseType[]>([]);
  const [inventorySummary, setInventorySummary] = useState<InventorySummary[]>([]);
  const [phoneModels, setPhoneModels] = useState<PhoneModel[]>([]);
  const [groupedCases, setGroupedCases] = useState<GroupedCases>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [caseImageMap, setCaseImageMap] = useState<Record<number, string>>({});

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        
        // Fetch popular case types
        const { data: casesData, error: casesError } = await supabase
          .from('case_types')
          .select('*')
          .order('id');
        
        if (casesError) throw casesError;
        
        // Fetch inventory summary
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory_items')
          .select('case_type_id, quantity');
        
        if (inventoryError) throw inventoryError;
        
        // Fetch phone models for generating image paths
        const { data: phonesData, error: phonesError } = await supabase
          .from('phone_models')
          .select('*')
          .eq('active', true);
        
        if (phonesError) throw phonesError;
        
        // Process phone models to add brand information
        const processedPhoneModels = phonesData?.map(model => {
          let brand = 'Other';
          
          if (model.name.includes('iPhone')) {
            brand = 'iPhone';
          } else if (model.name.includes('Samsung')) {
            brand = 'Samsung';
          } else if (model.name.includes('Pixel')) {
            brand = 'Google Pixel';
          }
          
          return {
            ...model,
            brand
          };
        }) || [];
        
        setPhoneModels(processedPhoneModels);
        
        // Group cases by brand and type
        const grouped: GroupedCases = {};
        
        // Initialize the structure
        BRANDS.forEach(brand => {
          grouped[brand] = {
            models: [],
            cases: {}
          };
          
          // Initialize case types
          CASE_TYPES.forEach(caseType => {
            grouped[brand].cases[caseType] = [];
          });
        });
        
        // Populate models by brand
        processedPhoneModels.forEach(model => {
          if (grouped[model.brand]) {
            grouped[model.brand].models.push(model);
          }
        });
        
        // Associate cases with models
        if (casesData) {
          casesData.forEach(caseType => {
            // For each brand, if the case type is in our target list, add it
            BRANDS.forEach(brand => {
              if (CASE_TYPES.includes(caseType.name) && grouped[brand]) {
                grouped[brand].cases[caseType.name] = [...(grouped[brand].cases[caseType.name] || []), caseType];
              }
            });
          });
        }
        
        setGroupedCases(grouped);
        
        // Calculate inventory summary
        const summary: InventorySummary[] = [];
        inventoryData?.forEach(item => {
          const existingSummary = summary.find(s => s.caseTypeId === item.case_type_id);
          if (existingSummary) {
            existingSummary.totalAvailable += item.quantity;
          } else {
            summary.push({
              caseTypeId: item.case_type_id,
              totalAvailable: item.quantity
            });
          }
        });
        
        // Create a map of case types to Clear Case images
        const imageMap: Record<number, string> = {};
        
        // For each case type, try to find a Clear Case image
        if (casesData && phonesData) {
          const clearCaseType = casesData.find(c => c.name === 'Clear Case');
          
          if (clearCaseType) {
            // Try with the first iPhone model
            const iPhoneModel = phonesData.find(p => p.name.includes('iPhone'));
            
            if (iPhoneModel) {
              for (const caseType of casesData) {
                // Check if a clear case image exists for this iPhone model
                const imagePath = `/phone_case/Clear_Case/${iPhoneModel.name.replace(/\s+/g, '_')}.png`;
                if (await imageExists(imagePath)) {
                  imageMap[caseType.id] = imagePath;
                }
              }
            }
          }
        }
        
        setCaseImageMap(imageMap);
        setPopularCases(casesData || []);
        setInventorySummary(summary);
      } catch (err: any) {
        console.error('Error fetching data:', err.message);
        setError('Failed to load case collection. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Function to get the appropriate image URL for a case
  const getCaseImageUrl = (caseItem: CaseType, brand: string = '', deviceName: string = ''): string => {
    // If brand and device name are provided, check specific path first
    if (brand && deviceName && caseItem.name) {
      const specificPath = `/phone_case/${brand}/${deviceName.replace(/\s+/g, '_')}/${caseItem.name.replace(/\s+/g, '_')}.png`;
      // We would check if this exists, but for now we'll just use the map or fallback
    }
    
    // First check if we have a mapped Clear Case image
    if (caseImageMap[caseItem.id]) {
      return caseImageMap[caseItem.id];
    }
    
    // Otherwise, use the case's own image or fallback
    return caseItem.image_url || FALLBACK_CASE_IMAGE;
  };

  // Check if a case type has inventory available
  const isCaseAvailable = (caseTypeId: number): boolean => {
    const inventoryItem = inventorySummary.find(item => item.caseTypeId === caseTypeId);
    return inventoryItem !== undefined && inventoryItem.totalAvailable > 0;
  };

  // Check if a case type is customizable
  const isCaseCustomizable = (caseTypeName: string): boolean => {
    return CUSTOMIZABLE_CASE_TYPES.includes(caseTypeName);
  };

  // Check if a case type should use direct buy
  const isDirectBuyCase = (caseTypeName: string): boolean => {
    return DIRECT_BUY_CASE_TYPES.includes(caseTypeName);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="pt-20">
        <div className="relative h-[80vh] w-full">
          <img 
            src="https://images.unsplash.com/photo-1559819774-c4542a473681?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-5xl font-bold mb-4">Premium Phone Cases</h2>
              <p className="text-xl mb-8">Protect your device in style</p>
              <Link 
                to="/custom-design"
                className="bg-white text-black px-8 py-3 rounded-full hover:bg-gray-100 transition inline-block"
              >
                Design Your Case
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collection */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Featured Collection</h2>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center max-w-3xl mx-auto">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader className="animate-spin h-8 w-8 text-black" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
              {popularCases.slice(0, 6).map((caseItem) => (
                <div key={caseItem.id} className="group cursor-pointer">
                  <div className="relative overflow-hidden">
                    <img 
                      src={getCaseImageUrl(caseItem)}
                      alt={caseItem.name}
                      className="w-full aspect-[3/4] object-cover transition group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = FALLBACK_CASE_IMAGE;
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm p-4 translate-y-full group-hover:translate-y-0 transition">
                      {isCaseAvailable(caseItem.id) && isCaseCustomizable(caseItem.name) ? (
                        <Link 
                          to={`/custom-design?caseType=${encodeURIComponent(caseItem.name)}`}
                          className="block w-full bg-black text-white py-2 rounded-full hover:bg-gray-800 transition text-center"
                        >
                          Customize
                        </Link>
                      ) : isCaseAvailable(caseItem.id) && isDirectBuyCase(caseItem.name) ? (
                        <Link 
                          to={`/payment?caseType=${encodeURIComponent(caseItem.name)}`}
                          className="block w-full bg-indigo-600 text-white py-2 rounded-full hover:bg-indigo-700 transition text-center"
                        >
                          Buy Now
                        </Link>
                      ) : isCaseAvailable(caseItem.id) ? (
                        <Link 
                          to={`/products?caseType=${encodeURIComponent(caseItem.name)}`}
                          className="block w-full bg-black text-white py-2 rounded-full hover:bg-gray-800 transition text-center"
                        >
                          View Details
                        </Link>
                      ) : (
                        <button 
                          className="w-full bg-gray-300 text-gray-500 py-2 rounded-full cursor-not-allowed"
                          disabled
                        >
                          Out of Stock
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-lg font-medium">{caseItem.name}</h4>
                    <div className="flex justify-between items-center">
                      <p className="text-gray-600">${caseItem.price.toFixed(2)}</p>
                      {!isCaseAvailable(caseItem.id) && (
                        <span className="text-xs text-red-600 font-medium">Out of Stock</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warranty Policies */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-12 text-center">Chính Sách Bảo Hành</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition flex flex-col items-center text-center">
                <div className="mb-4 bg-blue-50 p-4 rounded-full">
                  <ShieldCheck className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Kiểm Tra Hàng Trước Khi Nhận</h3>
                <p className="text-gray-600">Nếu không hài lòng có thể không nhận hàng. Chúng tôi cam kết chất lượng sản phẩm trước khi giao đến tay khách hàng.</p>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition flex flex-col items-center text-center">
                <div className="mb-4 bg-indigo-50 p-4 rounded-full">
                  <Clock className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Bảo Hành 6 Tháng</h3>
                <p className="text-gray-600">Bảo hành 1 đổi 1 không điều kiện trong vòng 6 tháng. Áp dụng cho tất cả các sản phẩm từ cửa hàng chúng tôi.</p>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition flex flex-col items-center text-center">
                <div className="mb-4 bg-green-50 p-4 rounded-full">
                  <Recycle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Giá Gốc Tận Xưởng</h3>
                <p className="text-gray-600">Giá cả phải chăng trực tiếp từ xưởng sản xuất. Không qua trung gian, giúp tiết kiệm chi phí cho khách hàng.</p>
              </div>
            </div>
          </div>

          {/* Printing Technology */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-12 text-center">Công Nghệ In Ấn Hiện Đại</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <img 
                  src="https://cms.cloudinary.vpsvc.com/images/c_scale,dpr_auto,f_auto,q_auto:best,t_productPageHeroGalleryTransformation_v2,w_auto/site-merchandising/4f54d973-fdec-4445-a879-83c424dbf4a6/en-au/ANZS1695-Imagery-Optimisation-Custom-Phone-Cases-PDP-marquee-005"
                  alt="Printing Technology"
                  className="rounded-xl shadow-lg w-full h-auto"
                />
              </div>
              <div>
                <div className="mb-8">
                  <div className="flex items-center mb-4">
                    <div className="bg-purple-50 p-3 rounded-full mr-4">
                      <Printer className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold">Công Nghệ UV Led</h3>
                  </div>
                  <p className="text-gray-600 ml-16">Máy in UV Led hiện đại nhất, cho phép in hình ảnh sắc nét lên nhiều bề mặt vật liệu, đặc biệt là các loại ốp lưng điện thoại.</p>
                </div>
                
                <div className="mb-8">
                  <div className="flex items-center mb-4">
                    <div className="bg-orange-50 p-3 rounded-full mr-4">
                      <Printer className="h-6 w-6 text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold">Công Nghệ Nhiệt Thăng Hoa</h3>
                  </div>
                  <p className="text-gray-600 ml-16">Kỹ thuật in nhiệt hiện đại giúp màu sắc thấm sâu vào bề mặt vật liệu, bền màu, không bong tróc sau thời gian dài sử dụng.</p>
                </div>
                
                <div className="mb-8">
                  <div className="flex items-center mb-4">
                    <div className="bg-red-50 p-3 rounded-full mr-4">
                      <Printer className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold">Công Nghệ DTF (Direct to Film)</h3>
                  </div>
                  <p className="text-gray-600 ml-16">Phương pháp in trực tiếp lên màng film, sau đó chuyển lên vật liệu, tạo ra hình ảnh có độ bền cao và màu sắc rực rỡ.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Partner Logos */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-12 text-center">Đối Tác Của Chúng Tôi</h2>
            <div className="relative overflow-hidden">
              <div className="flex animate-marquee">
                {PARTNERS.concat(PARTNERS).map((partner, index) => (
                  <div key={index} className="mx-6 shrink-0 flex items-center justify-center h-24 w-40">
                    <img 
                      src={partner.logo} 
                      alt={partner.name}
                      className="max-h-16 max-w-full object-contain filter grayscale hover:grayscale-0 transition"
                    />
                  </div>
                ))}
              </div>
            </div>
            <style>
              {`
                @keyframes marquee {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                  animation: marquee 30s linear infinite;
                }
              `}
            </style>
          </div>

          {/* Customer Reviews */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-12 text-center">Nhận Xét Từ Khách Hàng</h2>
            <div className="relative overflow-hidden">
              <div className="flex animate-slide">
                {USER_REVIEWS.concat(USER_REVIEWS).map((review, index) => (
                  <div key={index} className="mx-4 shrink-0 w-80 bg-white p-6 rounded-xl shadow-sm">
                    <div className="flex items-center mb-4">
                      <div className="mr-4">
                        {review.avatar ? (
                          <img 
                            src={review.avatar} 
                            alt={review.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 font-medium">{review.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{review.name}</h4>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{review.comment}</p>
                    <p className="text-gray-400 text-xs">{review.date}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center mt-8">
              <Link
                to="/reviews"
                className="flex items-center text-blue-600 hover:text-blue-800 transition font-medium"
              >
                Xem tất cả đánh giá
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <style>
              {`
                @keyframes slide {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
                .animate-slide {
                  animation: slide 40s linear infinite;
                }
              `}
            </style>
          </div>
        </div>
      </section>

      {/* Collection Banner */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-4">Premium Protection</h3>
              <p className="text-gray-600 mb-6">Our cases are crafted from the highest quality materials, providing exceptional protection while maintaining a slim profile.</p>
              <Link 
                to="/custom-design"
                className="bg-black text-white px-6 py-3 rounded-full hover:bg-gray-800 transition inline-block"
              >
                Explore Custom Designs
              </Link>
            </div>
            <div className="relative">
              <img 
                src="https://cdn.thewirecutter.com/wp-content/media/2024/10/BEST-IPHONE-16-CASES-2048px-4833-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp"
                alt="Premium Cases"
                className="rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
