import { useTranslations } from 'next-intl';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";

export default function AboutPage() {
  const t = useTranslations('about');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <section className="relative py-24 lg:py-32">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-6 text-primary border-primary/20 bg-primary/5">
              <Icon name="RiSparkling2Line" className="w-4 h-4 mr-2" />
              {t('title')}
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              NanoEdit
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t('whatIs.description')}
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              {t('mission.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t('mission.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { key: 'fast', icon: 'RiFlashLine', color: 'text-amber-500' },
              { key: 'intuitive', icon: 'RiUserLine', color: 'text-blue-500' },
              { key: 'advanced', icon: 'RiRocketLine', color: 'text-purple-500' },
              { key: 'flexible', icon: 'RiSettings3Line', color: 'text-green-500' }
            ].map((feature) => (
              <Card key={feature.key} className="group bg-card/50 border-border backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon name={feature.icon} className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {t(`mission.features.${feature.key}.title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`mission.features.${feature.key}.description`)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              {t('keyFeatures.title')}
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              { key: 'aiGeneration', icon: 'RiAiGenerate', gradient: 'from-purple-500 to-pink-500' },
              { key: 'userFriendly', icon: 'RiUserSmileLine', gradient: 'from-blue-500 to-cyan-500' },
              { key: 'pricing', icon: 'RiMoneyDollarBoxLine', gradient: 'from-green-500 to-emerald-500' }
            ].map((feature) => (
              <Card key={feature.key} className="group bg-card/70 border-border backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon name={feature.icon} className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">
                    {t(`keyFeatures.${feature.key}.title`)}
                  </h3>
                  <ul className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <li key={i} className="flex items-start text-muted-foreground">
                        <Icon name="RiCheckLine" className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">
                          {t(`keyFeatures.${feature.key}.feature${i}`)}
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

      {/* Technology Section */}
      <section className="py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              {t('technology.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t('technology.description')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { key: 'aiModels', icon: 'RiRobotLine', color: 'bg-purple-500/10 text-purple-500' },
              { key: 'frontend', icon: 'RiCodeLine', color: 'bg-blue-500/10 text-blue-500' },
              { key: 'auth', icon: 'RiShieldCheckLine', color: 'bg-green-500/10 text-green-500' },
              { key: 'infrastructure', icon: 'RiCloudLine', color: 'bg-orange-500/10 text-orange-500' }
            ].map((tech) => (
              <div key={tech.key} className="group">
                <div className="text-center p-6 rounded-xl border border-border bg-card/30 hover:bg-card/50 transition-all duration-300">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${tech.color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon name={tech.icon} className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    {t(`technology.${tech.key}.title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`technology.${tech.key}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-muted/20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              {t('values.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              { key: 'innovation', icon: 'RiLightbulbLine' },
              { key: 'simplicity', icon: 'RiLeafLine' },
              { key: 'quality', icon: 'RiStarLine' },
              { key: 'accessibility', icon: 'RiGlobalLine' }
            ].map((value) => (
              <div key={value.key} className="group">
                <div className="flex items-start space-x-4 p-6 rounded-xl border border-border bg-card/30 hover:bg-card/50 transition-all duration-300">
                  <div className="flex-shrink-0">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                      <Icon name={value.icon} className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {t(`values.${value.key}.title`)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(`values.${value.key}.description`)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team & Contact Section */}
      <section className="py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="text-center md:text-left">
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
                {t('team.title')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t('team.description')}
              </p>
            </div>

            <div className="text-center md:text-left">
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
                {t('contact.title')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t('contact.description')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild variant="default" className="bg-primary hover:bg-primary/90">
                  <Link href="/contact">
                    <Icon name="RiMailLine" className="w-4 h-4 mr-2" />
                    {t('contact.email.label')}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <a href="mailto:drewgrant616@gmail.com">
                    drewgrant616@gmail.com
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
            {t('footer.message')}
          </h2>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <Link href="/#image-editor">
              <Icon name="RiPlayFill" className="w-5 h-5 mr-2" />
              Start Creating
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}