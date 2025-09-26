import { useTranslations } from 'next-intl';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Icon from "@/components/icon";

export default function ContactPage() {
  const t = useTranslations('contact');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-6 text-primary border-primary/30 bg-primary/10 hover:bg-primary/15 transition-colors">
              <Icon name="RiCustomerServiceLine" className="w-4 h-4 mr-2" />
              {t('getInTouch.title')}
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              {t('title')}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t('getInTouch.description')}
            </p>
          </div>

          {/* Primary Contact Card */}
          <div className="max-w-xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/5 via-primary/8 to-primary/5 border-primary/30 shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 text-primary mb-4 mx-auto">
                  <Icon name="RiMailLine" className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  {t('primaryContact.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">{t('primaryContact.email.label')}</p>
                  <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300">
                    <a href="mailto:drewgrant616@gmail.com" className="text-lg font-semibold">
                      drewgrant616@gmail.com
                    </a>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('primaryContact.responseTime')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Help Categories */}
      <section className="py-16 bg-muted/10">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              {t('helpWith.title')}
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {[
              {
                key: 'technical',
                icon: 'RiToolsLine',
                gradient: 'from-blue-500 to-cyan-500',
                issues: ['issue1', 'issue2', 'issue3', 'issue4']
              },
              {
                key: 'business',
                icon: 'RiBusinessLine',
                gradient: 'from-purple-500 to-pink-500',
                issues: ['inquiry1', 'inquiry2', 'inquiry3', 'inquiry4']
              },
              {
                key: 'feedback',
                icon: 'RiFeedbackLine',
                gradient: 'from-green-500 to-emerald-500',
                issues: ['type1', 'type2', 'type3', 'type4']
              }
            ].map((category) => (
              <Card key={category.key} className="group bg-card/80 border-border/50 backdrop-blur-sm hover:shadow-xl hover:border-border transition-all duration-300">
                <CardContent className="p-6">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-r ${category.gradient} mb-5 group-hover:scale-105 transition-transform duration-300`}>
                    <Icon name={category.icon} className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-4">
                    {t(`helpWith.${category.key}.title`)}
                  </h3>
                  <ul className="space-y-2.5">
                    {category.issues.map((issue) => (
                      <li key={issue} className="flex items-start text-muted-foreground">
                        <Icon name="RiCheckLine" className="w-4 h-4 text-primary mr-2.5 mt-0.5 flex-shrink-0" />
                        <span className="text-sm leading-relaxed">
                          {t(`helpWith.${category.key}.${issue}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              {t('faq.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('faq.description')}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {[
              {
                key: 'account',
                icon: 'RiUserLine',
                color: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
                questions: ['q1']
              },
              {
                key: 'credits',
                icon: 'RiCoinLine',
                color: 'bg-green-500/15 text-green-600 border-green-500/20',
                questions: ['q1', 'q2']
              },
              {
                key: 'processing',
                icon: 'RiImageLine',
                color: 'bg-purple-500/15 text-purple-600 border-purple-500/20',
                questions: ['q1', 'q2']
              }
            ].map((faqCategory) => (
              <Card key={faqCategory.key} className="bg-card/60 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border ${faqCategory.color}`}>
                      <Icon name={faqCategory.icon} className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg">
                      {t(`faq.${faqCategory.key}.title`)}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {faqCategory.questions.map((q) => (
                    <div key={q} className="space-y-2">
                      <p className="font-semibold text-foreground text-sm leading-relaxed">
                        {t(`faq.${faqCategory.key}.${q}.question`)}
                      </p>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {t(`faq.${faqCategory.key}.${q}.answer`)}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Response Times & Business Hours */}
      <section className="py-16 bg-muted/10">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Response Times */}
            <Card className="bg-card/80 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/15 text-orange-600 border border-orange-500/20">
                    <Icon name="RiTimeLine" className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-xl">
                    {t('responseTimes.title')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {['general', 'technical', 'urgent'].map((type) => (
                  <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/50 transition-colors">
                    <span className="font-medium text-foreground text-sm">
                      {t(`responseTimes.${type}.label`)}
                    </span>
                    <Badge variant="secondary">
                      {t(`responseTimes.${type}.time`)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card className="bg-card/80 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/15 text-green-600 border border-green-500/20">
                    <Icon name="RiCalendarLine" className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-xl">
                    {t('businessHours.title')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm mb-4">
                  {t('businessHours.description')}
                </p>
                {['weekdays', 'weekends'].map((period) => (
                  <div key={period} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/50 transition-colors">
                    <span className="font-medium text-foreground text-sm">
                      {t(`businessHours.${period}.label`)}
                    </span>
                    <Badge variant="secondary">
                      {t(`businessHours.${period}.time`)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional Information */}
      <section className="py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Social Media */}
            <Card className="bg-card/80 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-pink-500/15 text-pink-600 border border-pink-500/20">
                    <Icon name="RiShareLine" className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-lg">{t('socialMedia.title')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  {t('socialMedia.description')}
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center text-muted-foreground">
                    <Icon name="RiCheckLine" className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    {t('socialMedia.follow')}
                  </li>
                  <li className="flex items-center text-muted-foreground">
                    <Icon name="RiCheckLine" className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                    {t('socialMedia.share')}
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feedback Form */}
            <Card className="bg-card/80 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/15 text-blue-600 border border-blue-500/20">
                    <Icon name="RiSurveyLine" className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-lg">{t('feedbackForm.title')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-400">
                  {t('feedbackForm.comingSoon')}
                </Badge>
                <p className="text-muted-foreground text-sm">
                  {t('feedbackForm.description')}
                </p>
              </CardContent>
            </Card>

            {/* Office Info */}
            <Card className="bg-card/80 border-border/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/15 text-purple-600 border border-purple-500/20">
                    <Icon name="RiBuilding2Line" className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-lg">{t('office.title')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {t('office.description')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer Message */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-primary/8 to-primary/5">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 text-primary mb-6">
            <Icon name="RiHeartLine" className="w-8 h-8" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
            {t('footer.thanks')}
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            {t('footer.message')}
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300">
            <a href="mailto:drewgrant616@gmail.com">
              <Icon name="RiMailLine" className="w-5 h-5 mr-2" />
              Get in Touch
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}